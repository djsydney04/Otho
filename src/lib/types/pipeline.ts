// Pipeline types

import { Stage, Company } from "./company"

export interface PipelineColumn {
  stage: Stage
  companies: Company[]
}
