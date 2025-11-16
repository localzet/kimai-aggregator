import { LineChart, BarChart } from '@mantine/charts'

export default {
    LineChart: LineChart.extend({
        styles: {
            root: {
                '& :global(.recharts-cartesian-grid-horizontal) line, & :global(.recharts-cartesian-grid-vertical) line': {
                    stroke: 'var(--mantine-color-dark-4)',
                    strokeDasharray: '3 3'
                },
                '& :global(.recharts-text)': {
                    fill: 'var(--mantine-color-dark-2)',
                    fontSize: '12px'
                },
                '& :global(.recharts-line)': {
                    filter: 'drop-shadow(0 2px 4px rgba(6, 182, 212, 0.3))'
                }
            }
        }
    }),
    BarChart: BarChart.extend({
        styles: {
            root: {
                '& :global(.recharts-cartesian-grid-horizontal) line, & :global(.recharts-cartesian-grid-vertical) line': {
                    stroke: 'var(--mantine-color-dark-4)',
                    strokeDasharray: '3 3'
                },
                '& :global(.recharts-text)': {
                    fill: 'var(--mantine-color-dark-2)',
                    fontSize: '12px'
                },
                '& :global(.recharts-bar)': {
                    filter: 'drop-shadow(0 2px 4px rgba(6, 182, 212, 0.2))'
                }
            }
        }
    })
}

