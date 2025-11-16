import { SimpleGrid, Group, Stack, Box, Loader } from '@mantine/core'
import { IconCurrencyDollar, IconClock, IconTrendingUp, IconCalendar } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { MetricCard } from '@/shared/ui/metrics'
import { WeekData } from '@/shared/api/kimaiApi'

interface FinancialMetricsProps {
  weeks: WeekData[]
  isLoading?: boolean
}

const MotionMetricCard = motion(MetricCard.Root)

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatInt(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value)
}

export function FinancialMetrics({ weeks, isLoading }: FinancialMetricsProps) {
  const totalAmount = weeks.reduce((sum, week) => sum + (week.totalAmount || 0), 0)
  const totalHours = weeks.reduce((sum, week) => sum + (week.totalHours || 0), 0)
  const avgAmountPerWeek = weeks.length > 0 ? totalAmount / weeks.length : 0
  const weeksCount = weeks.length

  const cards = [
    {
      icon: IconCurrencyDollar,
      title: 'Общая сумма',
      value: formatCurrency(totalAmount),
      color: 'green'
    },
    {
      icon: IconClock,
      title: 'Всего часов',
      value: totalHours.toFixed(2),
      color: 'blue'
    },
    {
      icon: IconTrendingUp,
      title: 'Среднее в неделю',
      value: formatCurrency(avgAmountPerWeek),
      color: 'cyan'
    },
    {
      icon: IconCalendar,
      title: 'Недель',
      value: formatInt(weeksCount),
      color: 'orange'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <MotionMetricCard key={card.title} variants={cardVariants}>
              <Group wrap="nowrap">
                <MetricCard.Icon c={card.color} p="sm">
                  <Icon size="32px" />
                </MetricCard.Icon>
                <Stack align="self-start" gap="xs" miw={0} w="100%">
                  <MetricCard.TextMuted>{card.title}</MetricCard.TextMuted>
                  <Box miw={0} w="100%">
                    <MetricCard.TextEmphasis ff="monospace" truncate>
                      {isLoading ? (
                        <Loader color={card.color} size="xs" />
                      ) : (
                        card.value
                      )}
                    </MetricCard.TextEmphasis>
                  </Box>
                </Stack>
              </Group>
            </MotionMetricCard>
          )
        })}
      </SimpleGrid>
    </motion.div>
  )
}

