export interface DisabledScreenProps {
  variant: 'admin' | 'pos';
  title?: string;
  message?: string;
  details?: {
    terminalId: string;
    branchName: string;
    reason: string;
  };
  supportText?: string;
  referenceCode?: string;
}