# Onboarding: начало наблюдаемого дня

## Цель

Onboarding существует, чтобы перед первым fixed tick объяснить игроку правила наблюдения и границы власти Т‑3. Он не заменяет tutorial текстом и не вводит «верный» маршрут. После трёх коротких карточек игрок сам запускает день либо выбирает явное действие «ПЕРЕЙТИ К ВИТРИНЕ».

| Шаг | Player-facing смысл | Механический контракт |
|---|---|---|
| 1. «Дом показывает следы» | Т‑3 видит состояние дома, а не внутреннее состояние людей | Симуляция ещё не запущена; никаких ticks, autosave boundary или platform GameplayStart. |
| 2. «Два предвестника» | Каждый риск считывается по двум независимым сигналам, цвету, форме и подписи | Sensor UI уже построен, но input закрыт overlay; low-sensory/reduced motion объяснены до выбора. |
| 3. «Маршрут — не правильный ответ» | Быстрый и бережный пути имеют разные видимые цены, последствия попадают в Journal | Action «НАЧАТЬ ДЕНЬ» вызывает `UnitySimulationDriver.StartSession()`. |

## Lifecycle

`UnitySimulationDriver` создаёт authoritative prologue snapshot в `Awake`, но не тикает до `StartSession()`. После start action драйвер сбрасывает accumulator, публикует снимок и испускает `SessionStarted`. `GamePlatformBootstrap` ждёт и platform-ready, и `SessionStarted`; только после обоих условий он вызывает `NotifyGameplayStarted()`. Это исключает ситуацию, где GamePush считает gameplay начатым, пока игрок всё ещё читает стартовый экран.

Platform pause ставит `Time.timeScale = 0`. Driver использует `Time.deltaTime`, поэтому fixed tick не продолжает идти под platform overlay. Локальный save на `OnApplicationPause` по-прежнему создаётся независимо от того, была ли сессия начата.

## Acceptance pass

| Проверка | Ожидаемый результат |
|---|---|
| Запуск пустой сцены | Auto-bootstrap строит showcase и overlay; tick не меняется без start action. |
| «ПРОДОЛЖИТЬ» дважды | Сменяются три семантические карточки; задний showcase не принимает route input. |
| «ПЕРЕЙТИ К ВИТРИНЕ» или «НАЧАТЬ ДЕНЬ» | Overlay скрывается, `IsSessionStarted` становится true, ticks идут, platform получает GameplayStart только после readiness. |
| Platform pause | Tick и event phase остаются неизменными до resume; local save остаётся доступен. |
| Low-sensory и keyboard | Карточки читаемы, кнопки имеют visible focus, а смысл доступен без motion/звука. |
| Reload до начала дня | Новый local session снова показывает onboarding; пользовательский save не перезаписывается автоматически. |

## Ограничения

В sandbox отсутствуют Unity Editor, WebGL player и данные GamePush test project. Поэтому автоматический core test подтверждает чистое simulation ядро, а этот onboarding flow требует Unity Editor/WebGL manual pass из таблицы выше перед публикацией.
