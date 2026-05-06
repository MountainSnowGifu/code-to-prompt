export interface ActionResult {
  action_type: string;
  label: string;
  success: boolean;
  output: string;
  error: string | null;
}
