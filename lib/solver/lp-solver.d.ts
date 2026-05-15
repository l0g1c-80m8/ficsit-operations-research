declare module 'javascript-lp-solver' {
  export interface LPModel {
    optimize: string;
    opType: 'max' | 'min';
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, number>;
  }
  export interface LPResult {
    feasible: boolean;
    result: number;
    bounded: boolean;
    [varName: string]: unknown;
  }
  const solver: {
    Solve: (model: LPModel) => LPResult & Record<string, number>;
  };
  export default solver;
}
