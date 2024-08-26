export interface IFacade {
  name: string
  repo: string
}

export interface IProduct {
  name: string
  company: string
  homepage?: string
  category: string
  /** @deprecated - Use `category` instead. */
  categories: string[]
  urlPatterns?: string[]
  facades?: IFacade[]
}

export interface IEntity {
  name: string
  company: string
  homepage?: string
  category: string
  /** @deprecated - Use `category` instead. */
  categories: string[]
  domains: string[]
  products?: IProduct[]
  averageExecutionTime: number
  totalExecutionTime: number
  totalOccurrences: number
}

export declare const entities: IEntity[]
export declare function getRootDomain(url: string): string
export declare function getEntity(url: string): IEntity | undefined
export declare function getProduct(url: string): IProduct | undefined
