declare module 'react-simple-maps' {
  import * as React from 'react';

  export interface GeographiesChildrenArgs {
    geographies: any[]; // You can refine this further if needed
  }

  export interface GeographyStyleSet {
    default?: React.CSSProperties;
    hover?: React.CSSProperties;
    pressed?: React.CSSProperties;
  }

  export interface GeographyProps {
    geography: any;
    style?: GeographyStyleSet;
    onMouseEnter?: (evt: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
    onMouseLeave?: (evt: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
    onMouseMove?: (evt: React.MouseEvent<SVGPathElement, MouseEvent>) => void;
  }

  export interface GeographiesProps {
    geography: string | object;
    children?: (args: GeographiesChildrenArgs) => React.ReactNode;
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
}
