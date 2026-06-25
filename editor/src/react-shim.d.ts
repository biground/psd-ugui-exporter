declare namespace JSX {
  interface Element {}

  interface IntrinsicAttributes {
    key?: string | number;
  }

  interface IntrinsicElements {
    [elementName: string]: any;
  }
}

declare module 'react' {
  export type SetStateAction<T> = T | ((previous: T) => T);
  export type Dispatch<T> = (value: T) => void;
  export interface RefObject<T> {
    current: T | null;
  }

  export function useEffect(effect: () => void | (() => void), dependencies?: unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), dependencies?: unknown[]): void;
  export function useMemo<T>(factory: () => T, dependencies: unknown[]): T;
  export function useRef<T>(initialValue: T | null): RefObject<T>;
  export function useState<T>(initialState: T | (() => T)): [T, Dispatch<SetStateAction<T>>];

  const React: {
    StrictMode: unknown;
  };

  export default React;
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: string): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: string): JSX.Element;
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: JSX.Element): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}
