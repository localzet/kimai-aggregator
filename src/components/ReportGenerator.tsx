import { Button, Group, Modal, Stack, TextInput, NumberInput, Select, Paper, Text, Badge } from '@mantine/core'
import { IconFileTypePdf } from '@tabler/icons-react'
import { useState, useRef } from 'react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { WeekData } from '@/shared/api/kimaiApi'
import { Settings } from '@/shared/hooks/useSettings'

dayjs.extend(isoWeek)

interface ReportGeneratorProps {
  weeks: WeekData[]
  settings: Settings
}

function ReportGenerator({ weeks, settings }: ReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reportConfig, setReportConfig] = useState({
    startWeek: weeks.length > 0 ? weeks[weeks.length - 1].weekKey : '',
    endWeek: weeks.length > 0 ? weeks[0].weekKey : '',
    companyName: 'ООО "Компания"',
    reportTitle: 'Отчет о выполненных работах',
    includeProjects: true,
    includeActivities: true,
  })
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}ч ${mins}м`
  }

  const getSelectedWeeks = () => {
    const startIdx = weeks.findIndex(w => w.weekKey === reportConfig.startWeek)
    const endIdx = weeks.findIndex(w => w.weekKey === reportConfig.endWeek)
    
    if (startIdx === -1 || endIdx === -1) return []
    
    const [min, max] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
    return weeks.slice(min, max + 1)
  }

  const generatePDF = () => {
    const selectedWeeks = getSelectedWeeks()
    if (selectedWeeks.length === 0) {
      alert('Пожалуйста, выберите период')
      return
    }

    const totalMinutes = selectedWeeks.reduce((sum, w) => sum + w.totalMinutes, 0)
    const totalAmount = selectedWeeks.reduce((sum, w) => sum + (w.totalAmount || 0), 0)

    const projectStats = new Map<string, { name: string; minutes: number; amount: number }>()
    selectedWeeks.forEach(week => {
      week.projectStats?.forEach(stat => {
        const key = stat.name
        const existing = projectStats.get(key)
        if (existing) {
          existing.minutes += stat.minutes
          existing.amount += stat.amount
        } else {
          projectStats.set(key, {
            name: stat.name,
            minutes: stat.minutes,
            amount: stat.amount,
          })
        }
      })
    })

    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportConfig.reportTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        .document {
            max-width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            page-break-after: always;
        }
        .header {
            border-bottom: 2px solid #000;
            padding-bottom: 10mm;
            margin-bottom: 10mm;
        }
        .logo-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 5mm;
        }
        .company-name {
            font-size: 16pt;
            font-weight: bold;
            color: #000;
        }
        .report-number {
            font-size: 10pt;
            color: #666;
            text-align: right;
        }
        .title {
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            margin: 10mm 0;
        }
        .metadata {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            margin: 5mm 0;
            border: 1px solid #ddd;
            padding: 5mm;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 10mm 0;
            font-size: 10pt;
        }
        .table th {
            background-color: #f0f0f0;
            border: 1px solid #999;
            padding: 4mm;
            text-align: left;
            font-weight: bold;
        }
        .table td {
            border: 1px solid #ddd;
            padding: 4mm;
            text-align: left;
        }
        .table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .total-row {
            background-color: #e8f5e9;
            font-weight: bold;
        }
        .total-row td {
            border: 1px solid #999;
        }
        .summary {
            margin: 10mm 0;
            padding: 5mm;
            border: 1px solid #ddd;
            background-color: #f9f9f9;
        }
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 2mm 0;
        }
        .signature-section {
            margin-top: 20mm;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            width: 40mm;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 2mm;
            font-size: 9pt;
        }
        .footer {
            text-align: center;
            font-size: 8pt;
            color: #999;
            margin-top: 5mm;
            padding-top: 5mm;
            border-top: 1px solid #ddd;
        }
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .document {
                margin: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="document">
        <div class="header">
            <div class="logo-section">
                <div class="company-name">${reportConfig.companyName}</div>
                <div class="report-number">Отчет №${dayjs().format('YYYY-MM-DD-HHmm')}</div>
            </div>
        </div>

        <div class="title">${reportConfig.reportTitle}</div>

        <div class="metadata">
            <span>Период: ${selectedWeeks[selectedWeeks.length - 1].startDate.format('DD.MM.YYYY')} - ${selectedWeeks[0].endDate.format('DD.MM.YYYY')}</span>
            <span>Дата подготовки: ${dayjs().format('DD.MM.YYYY HH:mm')}</span>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Неделя</th>
                    <th>Начало</th>
                    <th>Конец</th>
                    <th style="text-align: right;">Часы</th>
                    <th style="text-align: right;">Сумма</th>
                </tr>
            </thead>
            <tbody>
                ${selectedWeeks.map(week => `
                <tr>
                    <td>W${week.week}</td>
                    <td>${week.startDate.format('DD.MM')}</td>
                    <td>${week.endDate.format('DD.MM')}</td>
                    <td style="text-align: right;">${(week.totalHours || 0).toFixed(2)}</td>
                    <td style="text-align: right;">${formatCurrency(week.totalAmount || 0)}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="3">ИТОГО</td>
                    <td style="text-align: right;">${(totalMinutes / 60).toFixed(2)}</td>
                    <td style="text-align: right;">${formatCurrency(totalAmount)}</td>
                </tr>
            </tbody>
        </table>

        ${reportConfig.includeProjects && projectStats.size > 0 ? `
        <h3 style="font-size: 12pt; margin-top: 10mm; margin-bottom: 5mm;">Распределение по проектам</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Проект</th>
                    <th style="text-align: right;">Часы</th>
                    <th style="text-align: right;">Сумма</th>
                    <th style="text-align: right;">% от суммы</th>
                </tr>
            </thead>
            <tbody>
                ${Array.from(projectStats.values())
                  .sort((a, b) => b.amount - a.amount)
                  .map(stat => `
                <tr>
                    <td>${stat.name}</td>
                    <td style="text-align: right;">${(stat.minutes / 60).toFixed(2)}</td>
                    <td style="text-align: right;">${formatCurrency(stat.amount)}</td>
                    <td style="text-align: right;">${((stat.amount / totalAmount) * 100).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="summary">
            <h3 style="font-size: 11pt; margin-bottom: 5mm;">Сводка</h3>
            <div class="summary-item">
                <span>Всего отработано часов:</span>
                <span><strong>${(totalMinutes / 60).toFixed(2)}</strong> ч</span>
            </div>
            <div class="summary-item">
                <span>Итого по ставке ${settings.ratePerMinute.toFixed(2)} руб/мин:</span>
                <span><strong>${formatCurrency(totalAmount)}</strong></span>
            </div>
            <div class="summary-item">
                <span>Средний доход в час:</span>
                <span><strong>${formatCurrency(totalAmount / (totalMinutes / 60))}</strong>/ч</span>
            </div>
        </div>

        <div class="signature-section">
            <div class="signature">
                <div>Подпись</div>
                <div>____________________</div>
            </div>
            <div class="signature">
                <div>Печать</div>
                <div style="height: 20mm;"></div>
            </div>
        </div>

        <div class="footer">
            Документ подготовлен автоматически. Киmai Aggregator
        </div>
    </div>
</body>
</html>
    `

    if (iframeRef.current) {
      iframeRef.current.srcdoc = htmlContent
      setTimeout(() => {
        iframeRef.current?.contentWindow?.print()
      }, 500)
    }
  }

  const weekOptions = weeks.map(w => ({
    value: w.weekKey,
    label: `W${w.week} ${w.year} (${w.startDate.format('DD.MM')}-${w.endDate.format('DD.MM')})`,
  }))

  return (
    <>
      <Button
        leftSection={<IconFileTypePdf size={16} />}
        variant="light"
        onClick={() => setIsOpen(true)}
      >
        Генерировать отчет
      </Button>

      <Modal opened={isOpen} onClose={() => setIsOpen(false)} title="Генерация PDF отчета" size="lg">
        <Stack gap="md">
          <TextInput
            label="Название компании"
            value={reportConfig.companyName}
            onChange={(e) => setReportConfig({ ...reportConfig, companyName: e.currentTarget.value })}
          />

          <TextInput
            label="Заголовок отчета"
            value={reportConfig.reportTitle}
            onChange={(e) => setReportConfig({ ...reportConfig, reportTitle: e.currentTarget.value })}
          />

          <Select
            label="Начало периода"
            value={reportConfig.startWeek}
            onChange={(value) => setReportConfig({ ...reportConfig, startWeek: value || '' })}
            data={weekOptions}
            searchable
          />

          <Select
            label="Конец периода"
            value={reportConfig.endWeek}
            onChange={(value) => setReportConfig({ ...reportConfig, endWeek: value || '' })}
            data={weekOptions}
            searchable
          />

          <Group>
            <Badge size="lg" color={reportConfig.includeProjects ? 'green' : 'gray'}>
              Проекты: {reportConfig.includeProjects ? 'Да' : 'Нет'}
            </Badge>
          </Group>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setIsOpen(false)}>Отмена</Button>
            <Button onClick={generatePDF}>Генерировать PDF</Button>
          </Group>
        </Stack>
      </Modal>

      <iframe
        ref={iframeRef}
        style={{ display: 'none' }}
        title="PDF Preview"
      />
    </>
  )
}

export default ReportGenerator
