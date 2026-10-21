export interface MlObjectiveItem {
  region: string;
  product: string;
  predicted_target: number;
  period: string;
}

export interface MlGenerateResponse {
  period: string;
  objetivos: MlObjectiveItem[];
  omitidos?: { region: string; product: string }[];
}

export interface SaveMlObjectivesSummary {
  rowsSaved: number;
  skipped: { region: string; product: string; reason: string }[];
}
