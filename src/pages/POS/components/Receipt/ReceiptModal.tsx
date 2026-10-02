import { useEffect, useRef } from "react";
import { Modal } from "../Modal/Modal";
import { useSchool } from "@/hooks/useSchool";
import type { ReceiptModalProps } from "./types";

const TICKET_CSS = `
  @page { margin: 0; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.4; width: 76mm; padding: 4mm; }
  .ticket { width: 100%; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .header { margin-bottom: 4px; }
  .header h1 { font-size: 13px; margin-bottom: 2px; }
  .header p { font-size: 10px; margin: 1px 0; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .info-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 10px; }
  .items-table { width: 100%; font-size: 10px; border-collapse: collapse; margin: 4px 0; }
  .items-table th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 2px; font-weight: bold; }
  .items-table td { padding: 2px 0; vertical-align: top; }
  .items-table .qty { text-align: right; width: 30px; }
  .items-table .price { text-align: right; width: 50px; }
  .items-table .subtotal { text-align: right; width: 55px; }
  .item-name { display: block; }
  .item-detail { font-size: 9px; color: #333; }
  .totals { margin-top: 4px; font-size: 10px; }
  .totals .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .totals .total-row { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
  .payment-info { margin-top: 4px; font-size: 10px; }
  .payment-info .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .footer { margin-top: 8px; text-align: center; font-size: 9px; }
  .void-badge { text-align: center; font-weight: bold; font-size: 12px; margin: 4px 0; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 0; }
  }
`;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTitle(type: "sale" | "quote" | "return"): string {
  switch (type) {
    case "sale":
      return "COMPROBANTE DE VENTA";
    case "quote":
      return "PRESUPUESTO";
    case "return":
      return "NOTA DE CRÉDITO";
  }
}

function getNumberDisplay(number: number, type: "sale" | "quote" | "return"): string {
  const prefix = type === "return" ? "R" : "";
  return `#${number.toString().padStart(4, "0")}${prefix}`;
}

export function ReceiptModal({ isOpen, onClose, onConfirm, receipt }: ReceiptModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { schoolName } = useSchool();

  const handlePrint = () => {
    if (!ticketRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const ticketHtml = ticketRef.current.outerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${getTitle(receipt.type)} ${getNumberDisplay(receipt.number, receipt.type)}</title>
          <meta charset="utf-8">
          <style>${TICKET_CSS}</style>
        </head>
        <body onload="window.print(); window.onafterprint = () => window.close();">
          ${ticketHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <Modal title="" isOpen={isOpen} onClose={onClose} size="lg">
      <div ref={ticketRef} className="ticket max-w-md">
        <div className="header center">
          <h1 className="bold">{schoolName}</h1>
          <p>{getTitle(receipt.type)}</p>
          <p className="bold">{getNumberDisplay(receipt.number, receipt.type)}</p>
        </div>
        <div className="divider" />
        <div className="info-row">
          <span>Fecha</span>
          <span>{formatDate(receipt.createdAt)}</span>
        </div>
        <div className="info-row">
          <span>Vendedor</span>
          <span>{receipt.seller.name}</span>
        </div>
        {receipt.client && (
          <div className="info-row">
            <span>Cliente</span>
            <span>{receipt.client.fullName}</span>
          </div>
        )}
        <div className="divider" />
        <table className="items-table">
          <thead>
            <tr>
              <th className="w-[55%]">Producto</th>
              <th className="qty">Cant</th>
              <th className="price">P.Unit</th>
              <th className="subtotal">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <span className="item-name">{item.name}</span>
                  <span className="item-detail">{item.type === "product" ? "PRODUCTO" : "SERVICIO"}</span>
                </td>
                <td className="qty">{item.quantity}</td>
                <td className="price">${item.unitPrice.toLocaleString("es-AR")}</td>
                <td className="subtotal">${item.subtotal.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="divider" />
        <div className="totals">
          <div className="row">
            <span>Subtotal</span>
            <span>${receipt.subtotal.toLocaleString("es-AR")}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="row" style={{ color: "#dc2626" }}>
              <span>Descuento</span>
              <span>−${receipt.discount.toLocaleString("es-AR")}</span>
            </div>
          )}
          <div className="row total-row">
            <span>TOTAL</span>
            <span>${receipt.total.toLocaleString("es-AR")}</span>
          </div>
        </div>
        {receipt.paymentMethod && (
          <div className="payment-info">
            <div className="row">
              <span>Método</span>
              <span>
                {receipt.paymentMethod === "cash" && "Efectivo"}
                {receipt.paymentMethod === "transfer" && "Transferencia"}
                {receipt.paymentMethod === "credit" && "Crédito"}
              </span>
            </div>
            {receipt.paymentMethod === "cash" && (receipt.amountReceived ?? 0) > 0 && (
              <>
                <div className="row">
                  <span>Recibido</span>
                  <span>${(receipt.amountReceived ?? 0).toLocaleString("es-AR")}</span>
                </div>
                {(receipt.change ?? 0) > 0 && (
                  <div className="row">
                    <span>Vuelto</span>
                    <span>${(receipt.change ?? 0).toLocaleString("es-AR")}</span>
                  </div>
                )}
              </>
            )}
            {receipt.paymentMethod === "transfer" && (receipt.amountReceived ?? 0) > 0 && (
              <div className="row">
                <span>Recibido</span>
                <span>${(receipt.amountReceived ?? 0).toLocaleString("es-AR")}</span>
              </div>
            )}
            {receipt.paymentMethod === "credit" && (
              <div className="row">
                <span>Queda a cuenta</span>
                <span>${receipt.total.toLocaleString("es-AR")}</span>
              </div>
            )}
          </div>
        )}
        <div className="footer">
          <p>¡Gracias por su compra!</p>
        </div>
      </div>
      <div className="mt-6 flex gap-3 no-print">
        <button
          onClick={handlePrint}
          className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
        >
          Imprimir
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200 transition-colors"
        >
          Continuar
        </button>
      </div>
    </Modal>
  );
}