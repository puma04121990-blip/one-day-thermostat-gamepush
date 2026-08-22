# GitHub Governance

## Текущее состояние

Репозиторий создан как приватный: [`puma04121990-blip/one-day-thermostat-gamepush`](https://github.com/puma04121990-blip/one-day-thermostat-gamepush). В нём активна CI-проверка `Core checks`, которая на каждом push/PR выполняет secret policy, компиляцию deterministic core smoke-test и проверку обязательной production-документации.

Попытка включить branch protection для `main` была отклонена GitHub с HTTP 403: для текущего приватного репозитория эта возможность требует GitHub Pro либо публичного репозитория. Поэтому защита **не считается включённой**. Текущий файл `.github/branch-protection.json` хранит воспроизводимую желаемую конфигурацию; он не применяет правила сам по себе.

## Когда защита станет доступна

После появления поддержки branch protection для private repository примените следующий файл через GitHub CLI под владельцем репозитория:

```bash
gh api --method PUT \
  repos/puma04121990-blip/one-day-thermostat-gamepush/branches/main/protection \
  --input .github/branch-protection.json
```

Конфигурация требует успешный job `secret-and-core-check`, linear history, запрещает force pushes и удаление ветки. Не включайте required review, если проект остаётся личным и это блокирует ожидаемый release flow; при появлении команды добавьте review policy отдельным решением в `DECISIONS.md`.

## Операционный минимум до защиты

До включения server-side защиты автор изменений обязан: работать в тематической ветке, запускать Core checks, не force-push в `main`, проверять clean `git status`, выполнять release checklist и хранить project credentials только в ignored local configuration. Эта дисциплина не заменяет server-side policy, но сохраняет репозиторий совместимым с будущим включением защиты.
