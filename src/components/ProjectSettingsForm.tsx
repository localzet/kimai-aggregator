import {
  Stack,
  Title,
  Divider,
  Switch,
  NumberInput,
  TextInput,
  Button,
  Group,
  ActionIcon,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Project } from "@/shared/api/kimaiApi";
import { Settings } from "@/shared/hooks/useSettings";

dayjs.extend(isoWeek);

interface ProjectSettingsFormProps {
  project: Project;
  settings: Settings;
  onUpdate: (settings: Settings) => void;
}

export default function ProjectSettingsForm({
  project,
  settings,
  onUpdate,
}: ProjectSettingsFormProps) {
  const projectSettings = settings.projectSettings?.[project.id] || {
    enabled: false,
    hasWeeklyGoal: false,
    weeklyGoalHours: 20,
    hasPaymentPeriods: false,
    paymentPeriodWeeks: 2,
    startWeekNumber: 1,
    startYear: new Date().getFullYear(),
    hasStages: false,
    stages: [],
  };

  const updateSetting = (field: string, value: unknown) => {
    const currentSettings = { ...settings };
    if (!currentSettings.projectSettings) {
      currentSettings.projectSettings = {};
    }
    if (!currentSettings.projectSettings[project.id]) {
      currentSettings.projectSettings[project.id] = { ...projectSettings };
    }
    currentSettings.projectSettings[project.id] = {
      ...currentSettings.projectSettings[project.id],
      [field]: value,
    };
    onUpdate(currentSettings);
  };

  const addStage = () => {
    const newStages = [
      ...(projectSettings.stages || []),
      {
        name: "",
        plannedHours: 0,
        startDate: dayjs().format("YYYY-MM-DD"),
        endDate: dayjs().add(1, "month").format("YYYY-MM-DD"),
      },
    ];
    updateSetting("stages", newStages);
  };

  const removeStage = (index: number) => {
    const newStages = (projectSettings.stages || []).filter(
      (_, i) => i !== index,
    );
    updateSetting("stages", newStages);
  };

  const updateStage = (index: number, field: string, value: unknown) => {
    const newStages = [...(projectSettings.stages || [])];
    newStages[index] = { ...newStages[index], [field]: value };
    updateSetting("stages", newStages);
  };

  const getCurrentWeekNumber = () => {
    return dayjs().isoWeek();
  };

  const getCurrentYear = () => {
    return dayjs().year();
  };

  return (
    <Stack gap="md" mt="md">
      <Switch
        label="Включить отслеживание проекта"
        checked={projectSettings.enabled}
        onChange={(e) => updateSetting("enabled", e.currentTarget.checked)}
      />

      {projectSettings.enabled && (
        <>
          <Divider />
          <Title order={5}>Цель по часам</Title>

          <Switch
            label="Есть цель по часам в неделю"
            checked={projectSettings.hasWeeklyGoal}
            onChange={(e) =>
              updateSetting("hasWeeklyGoal", e.currentTarget.checked)
            }
          />

          {projectSettings.hasWeeklyGoal && (
            <NumberInput
              label="Цель часов в неделю"
              description="Минимальное количество часов для достижения цели"
              min={0}
              step={0.5}
              value={projectSettings.weeklyGoalHours || 20}
              onChange={(value) =>
                updateSetting("weeklyGoalHours", Number(value) || 0)
              }
            />
          )}

          <Divider />
          <Title order={5}>Периоды оплаты</Title>

          <Switch
            label="Есть периоды оплаты"
            checked={projectSettings.hasPaymentPeriods}
            onChange={(e) =>
              updateSetting("hasPaymentPeriods", e.currentTarget.checked)
            }
          />

          {projectSettings.hasPaymentPeriods && (
            <>
              <NumberInput
                label="Период оплаты (недель)"
                description="Количество недель в периоде оплаты"
                min={1}
                value={projectSettings.paymentPeriodWeeks || 2}
                onChange={(value) =>
                  updateSetting("paymentPeriodWeeks", Number(value) || 1)
                }
              />

              <NumberInput
                label="Номер недели начала первого периода (ISO week)"
                description={`Текущая неделя: ${getCurrentWeekNumber()}`}
                min={1}
                max={53}
                value={
                  projectSettings.startWeekNumber || getCurrentWeekNumber()
                }
                onChange={(value) =>
                  updateSetting("startWeekNumber", Number(value) || 1)
                }
              />

              <NumberInput
                label="Год начала первого периода"
                description={`Текущий год: ${getCurrentYear()}`}
                min={2020}
                max={2100}
                value={projectSettings.startYear || getCurrentYear()}
                onChange={(value) =>
                  updateSetting("startYear", Number(value) || getCurrentYear())
                }
              />
            </>
          )}

          <Divider />
          <Title order={5}>Этапы проекта</Title>

          <Switch
            label="Есть этапы проекта"
            checked={projectSettings.hasStages}
            onChange={(e) =>
              updateSetting("hasStages", e.currentTarget.checked)
            }
          />

          {projectSettings.hasStages && (
            <Stack gap="md">
              {(projectSettings.stages || []).map((stage, index) => (
                <Group key={index} align="flex-start" wrap="nowrap">
                  <Stack gap="sm" style={{ flex: 1 }}>
                    <TextInput
                      label="Название этапа"
                      value={stage.name}
                      onChange={(e) =>
                        updateStage(index, "name", e.target.value)
                      }
                    />
                    <NumberInput
                      label="Плановые часы"
                      min={0}
                      step={0.5}
                      value={stage.plannedHours}
                      onChange={(value) =>
                        updateStage(index, "plannedHours", Number(value) || 0)
                      }
                    />
                    <Group grow>
                      <DateInput
                        label="Дата начала"
                        value={
                          stage.startDate
                            ? dayjs(stage.startDate).toDate()
                            : null
                        }
                        onChange={(date) =>
                          updateStage(
                            index,
                            "startDate",
                            date ? dayjs(date).format("YYYY-MM-DD") : "",
                          )
                        }
                      />
                      <DateInput
                        label="Дата окончания"
                        value={
                          stage.endDate ? dayjs(stage.endDate).toDate() : null
                        }
                        onChange={(date) =>
                          updateStage(
                            index,
                            "endDate",
                            date ? dayjs(date).format("YYYY-MM-DD") : "",
                          )
                        }
                      />
                    </Group>
                  </Stack>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => removeStage(index)}
                    mt="xl"
                  >
                    <IconTrash size="1rem" />
                  </ActionIcon>
                </Group>
              ))}
              <Button
                leftSection={<IconPlus size="1rem" />}
                variant="light"
                onClick={addStage}
              >
                Добавить этап
              </Button>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
