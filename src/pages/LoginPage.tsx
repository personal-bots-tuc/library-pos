import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../hooks/authService";
import { getPublicSchoolBySlug } from "../api/schools";
import { DisabledScreen } from "../components/DisabledScreen";

type LoginState = "resolving" | "notFound" | "ready" | "invalidUrl" | "disabled";

function PinInput({ pin, onChange, onKeyDown, loading, autoFocusIndex = 0 }: {
  pin: string[];
  onChange: (_index: number, _value: string) => void;
  onKeyDown: (_index: number, _e: KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;
  autoFocusIndex?: number;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="flex justify-center gap-3">
      {pin.map((_digit, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={pin[index]}
          onChange={(e) => {
            const value = e.target.value;
            onChange(index, value);
            if (value && index < 3) {
              inputsRef.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(e) => onKeyDown(index, e)}
          disabled={loading}
          autoFocus={index === autoFocusIndex}
          className="w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 border-neutral-700 bg-neutral-800 text-white focus:border-primary-500 focus:outline-none transition-colors"
        />
      ))}
    </div>
  );
}

function SubmitButton({ loading, disabled, children }: {
  loading: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? "Verificando..." : children}
    </button>
  );
}

export default function LoginPage() {
  const { loginPin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("pos_app");

  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<LoginState>("resolving");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [showDisabledScreen, setShowDisabledScreen] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [disabledDetails, setDisabledDetails] = useState<{ terminalId: string; branchName: string; reason: string } | null>(null);

  function extractErrorInfo(err: unknown): { code?: string; message: string } {
    if (err && typeof err === 'object' && 'response' in err) {
      const response = (err as { response?: { data?: { error?: string; message?: string } } }).response;
      if (response?.data) {
        return {
          code: response.data.error,
          message: response.data.message || 'Error al iniciar sesión',
        };
      }
    }
    if (err instanceof Error) return { message: err.message };
    return { message: 'Error al iniciar sesión' };
  }

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function resolveSchool(slugValue: string) {
      try {
        const school = await getPublicSchoolBySlug(slugValue);
        if (!cancelled) {
          setSchoolId(school.id);
          setSchoolName(school.name);
          setState("ready");
        }
      } catch (err) {
        if (!cancelled) {
          const { code, message } = extractErrorInfo(err);
          if (code === 'SCHOOL_DISABLED') {
            setState("disabled");
            setDisabledMessage(message);
            setDisabledDetails({
              terminalId: 'N/A',
              branchName: slugValue,
              reason: 'Escuela deshabilitada por el super administrador',
            });
            setShowDisabledScreen(true);
          } else {
            setState("notFound");
          }
        }
      }
    }

    resolveSchool(slug);

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const fullPin = pin.join("");
    if (fullPin.length !== 4 || !schoolId) return;

    setLoading(true);
    setError("");
    try {
      await loginPin(fullPin, schoolId);
      if (slug) authService.setPosAppSlug(slug);
      navigate("/");
    } catch (err) {
      const { code, message } = extractErrorInfo(err);
      if (code === 'SCHOOL_DISABLED' || code === 'POS_DISABLED') {
        setShowDisabledScreen(true);
        setDisabledMessage(message);
        setDisabledDetails({
          terminalId: 'POS-CAJA-01',
          branchName: schoolName,
          reason: code === 'SCHOOL_DISABLED'
            ? 'Escuela deshabilitada por el super administrador'
            : 'Punto de venta deshabilitado por el administrador',
        });
      } else {
        setError("PIN incorrecto para este negocio");
        setPin(["", "", "", ""]);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (newPin.every((d) => d !== "") && index === 3) {
      setTimeout(() => handleSubmit(), 100);
    }
  }

  function handleKeyDown(_index: number, _e: KeyboardEvent<HTMLInputElement>) {
    // Backspace handling could be added here if needed
  }

  const pinDisabled = loading;
  const effectiveState: LoginState = !slug ? "invalidUrl" : state;

  if (showDisabledScreen) {
    return (
      <DisabledScreen
        variant="pos"
        message={disabledMessage}
        details={disabledDetails ?? undefined}
      />
    );
  }

  const renderState = () => {
    switch (effectiveState) {
      case "resolving":
        return (
          <div className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 text-center">
            Cargando negocio...
          </div>
        );
      case "invalidUrl":
        return (
          <div className="space-y-4 text-center">
            <div className="w-full px-4 py-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400">
              URL inválida
            </div>
            <p className="text-neutral-400 text-sm">
              Acceda al POS usando una URL con el parámetro <code className="px-1.5 py-0.5 bg-neutral-800 rounded text-primary-400 font-mono text-xs">?pos_app=slug-del-negocio</code>
            </p>
            <p className="text-neutral-500 text-xs">Ejemplo: <code className="font-mono">/login?pos_app=libreria</code></p>
          </div>
        );
      case "notFound":
        return (
          <div className="space-y-4 text-center">
            <div className="w-full px-4 py-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400">
              Negocio no válido
            </div>
            <p className="text-neutral-400 text-sm">
              No se encontró un negocio activo con el slug proporcionado.
            </p>
          </div>
        );
      case "ready":
        return (
          <>
            <p className="text-center text-neutral-300 mb-6">
              Ingrese su PIN · <strong className="text-white">{schoolName}</strong>
            </p>
            <PinInput pin={pin} onChange={handleChange} onKeyDown={handleKeyDown} loading={pinDisabled} />
            {error && <p className="text-center text-red-500 text-sm font-medium">{error}</p>}
            <SubmitButton loading={loading} disabled={pin.join("").length !== 4}>Ingresar</SubmitButton>
          </>
        );
      case "disabled":
        return (
          <DisabledScreen
            variant="pos"
            message={disabledMessage}
            details={disabledDetails ?? undefined}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-600 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Library System</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderState()}
        </form>
      </div>
    </div>
  );
}