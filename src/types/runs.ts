export interface Category {
  name: string,
  dtCategoryId: string,
  srcCategoryId: string,
  srcVariableKey?: string,
  srcVariableValue?: string,
}

export interface Run {
  name: string,
  video: string | undefined,
  comment: string,
  date: string,
  rta: string,
  time: number,
  source: string,
}

export interface PlacedRun extends Run {
  place: number
}

export interface RunSource {
  name: string,
  getRuns(category: Category, extraUserMapping: Array<UserMapping>): Promise<Array<Run>>,
}

export interface CategoryRuns {
  category: Category,
  runs: Array<PlacedRun>,
}

export interface UserMapping {
  dtName: string,
  srcName: string,
}