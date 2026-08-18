declare module '@aurouscia/china-areas/dist/index.js' {
  export interface Division {
    code: string
    name: string
  }

  export function getTopDivisions(): Division[]
  export function getDivisionChildren(code: string): Division[]
  export function isFinalDivision(code: string): boolean
}
