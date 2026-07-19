declare module "lightweight-charts" {
    export enum ColorType {
        Solid = "solid",
        VerticalGradient = "gradient",
    }

    export enum LineStyle {
        Solid = 0,
        Dotted = 1,
        Dashed = 2,
        LargeDashed = 3,
        SparseDotted = 4,
    }

    export interface ChartOptions {
        width?: number;
        height?: number;
        layout?: any;
        grid?: any;
        crosshair?: any;
        rightPriceScale?: any;
        timeScale?: any;
    }

    export interface IChartApi {
        addLineSeries(options?: any): ISeriesApi;
        addAreaSeries(options?: any): ISeriesApi;
        timeScale(): any;
        applyOptions(options: Partial<ChartOptions>): void;
        remove(): void;
    }

    export interface ISeriesApi {
        setData(data: any[]): void;
        update(data: any): void;
    }

    export function createChart(container: HTMLElement, options?: Partial<ChartOptions>): IChartApi;
}
