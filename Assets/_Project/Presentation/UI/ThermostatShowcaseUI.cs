using System;
using System.Linq;
using OneDayThermostat.Core;
using OneDayThermostat.Gameplay.Automation;
using OneDayThermostat.Presentation.Runtime;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace OneDayThermostat.Presentation.UI
{
    [RequireComponent(typeof(UnitySimulationDriver))]
    public sealed class ThermostatShowcaseUI : MonoBehaviour
    {
        private readonly Color _slate = new Color(.025f, .07f, .10f, .90f);
        private readonly Color _amber = new Color(.89f, .54f, .18f, 1f);
        private readonly Color _cyan = new Color(.55f, .84f, .91f, 1f);
        private UnitySimulationDriver _driver;
        private SensorMode _sensor = SensorMode.Heat;
        private Text _status;
        private Text _diagnostics;
        private Text _caption;
        private Text _policy;
        private Text _configuration;
        private Text _archive;
        private Button _routeA;
        private Button _routeB;
        private GameObject _onboardingOverlay;
        private Text _onboardingHeadline;
        private Text _onboardingBody;
        private Button _onboardingContinue;
        private int _onboardingStep;
        private Image _sensorWash;
        private Toggle _reducedMotion;
        private Toggle _lowSensory;
        private PolicyPreviewDTO _lastPolicyPreview;
        private ConfigurationPreviewDTO _lastConfigurationPreview;
        private string _candidateFirmware = "firmware.surface_memory";
        private string _candidateSensorModifier = "modifier.early_contour";
        private string _candidateRouteModifier = "modifier.soft_open";

        private void Awake()
        {
            _driver = GetComponent<UnitySimulationDriver>();
            _driver.SnapshotUpdated += Render;
            EnsureEventSystem();
            Build();
        }

        private void OnDestroy()
        {
            if (_driver != null) _driver.SnapshotUpdated -= Render;
        }

        private void Build()
        {
            var canvasRoot = new GameObject("Thermostat Showcase Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = canvasRoot.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasRoot.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);

            var background = CreateImage(canvasRoot.transform, "Cutaway", new Color(.04f, .09f, .12f, 1f));
            Stretch(background.rectTransform, 0, 0, 1, 1, 0, 0, 0, 0);
            var texture = Resources.Load<Texture2D>("Art/playable_house_cutaway");
            if (texture != null)
            {
                background.sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(.5f, .5f));
                background.type = Image.Type.Simple;
                background.color = Color.white;
            }

            _sensorWash = CreateImage(canvasRoot.transform, "SensorWash", new Color(.89f, .54f, .18f, .09f));
            Stretch(_sensorWash.rectTransform, 0, 0, 1, 1, 0, 0, 0, 0);
            var shade = CreateImage(canvasRoot.transform, "ReadableShade", new Color(.01f, .03f, .05f, .36f));
            Stretch(shade.rectTransform, 0, 0, 1, 1, 0, 0, 0, 0);

            var titlePanel = CreatePanel(canvasRoot.transform, "TopBar", _slate);
            Stretch(titlePanel, 0, 1, 1, 1, 28, -106, -28, -24);
            CreateText(titlePanel, "Title", "ОДИН ДЕНЬ ТЕРМОСТАТА", 28, _amber, TextAnchor.UpperLeft, new Vector2(24, -18), new Vector2(-24, -58));
            _status = CreateText(titlePanel, "Status", "Т‑3 · Инициализация датчиков", 17, Color.white, TextAnchor.LowerLeft, new Vector2(24, 14), new Vector2(-24, 54));

            var leftPanel = CreatePanel(canvasRoot.transform, "Sensors", _slate);
            Stretch(leftPanel, 0, 0, 0, 1, 28, 200, 330, -130);
            CreateText(leftPanel, "Heading", "СЕНСОРНЫЙ СЛОЙ", 17, _cyan, TextAnchor.UpperLeft, new Vector2(18, -14), new Vector2(-18, -42));
            var sensorNames = new[] { "Тепло", "Воздух", "Вибрация", "Влага", "Сеть", "Поверхность" };
            for (var i = 0; i < sensorNames.Length; i++)
            {
                var local = (SensorMode)i;
                var button = CreateButton(leftPanel, "Sensor_" + local, sensorNames[i], () => SelectSensor(local));
                Stretch(button.GetComponent<RectTransform>(), 0, 1, 1, 1, 18, -76 - i * 52, -18, -116 - i * 52);
            }

            var lowerPanel = CreatePanel(canvasRoot.transform, "Routes", _slate);
            Stretch(lowerPanel, 0, 0, 1, 0, 356, 24, -28, 170);
            CreateText(lowerPanel, "RouteHeading", "МАРШРУТ У ПОРОГА", 16, _cyan, TextAnchor.UpperLeft, new Vector2(18, -14), new Vector2(-18, -40));
            _routeA = CreateButton(lowerPanel, "PrimaryRoute", "НИЖНИЙ: быстрее · резонанс ветви 26", CommitPrimaryRoute);
            Stretch(_routeA.GetComponent<RectTransform>(), 0, 0, .50f, 1, 18, 18, -8, -50);
            _routeB = CreateButton(lowerPanel, "SecondaryRoute", "СРЕДНИЙ: тише · медленнее", CommitSecondaryRoute);
            Stretch(_routeB.GetComponent<RectTransform>(), .50f, 0, 1, 1, 8, 18, -18, -50);

            var rightPanel = CreatePanel(canvasRoot.transform, "Diagnostics", _slate);
            Stretch(rightPanel, 1, 0, 1, 1, -408, 200, -28, -130);
            CreateText(rightPanel, "Heading", "ДИАГНОСТИКА", 17, _cyan, TextAnchor.UpperLeft, new Vector2(18, -14), new Vector2(-18, -42));
            _diagnostics = CreateText(rightPanel, "Reasons", "Причины появятся после первого тика.", 16, Color.white, TextAnchor.UpperLeft, new Vector2(18, -56), new Vector2(-18, -150));
            _caption = CreateText(rightPanel, "Caption", "Подпись: мир ещё тих.", 15, new Color(.88f, .91f, .92f), TextAnchor.UpperLeft, new Vector2(18, -156), new Vector2(-18, -208));
            var preview = CreateButton(rightPanel, "PreviewPolicy", "ПРОВЕРИТЬ ПРАВИЛО", PreviewPolicy);
            Stretch(preview.GetComponent<RectTransform>(), 0, 0, 1, 0, 18, 82, -18, 42);
            var commit = CreateButton(rightPanel, "CommitPolicy", "ЗАКРЕПИТЬ ПОЛИТИКУ", CommitPolicy);
            Stretch(commit.GetComponent<RectTransform>(), 0, 0, 1, 0, 18, 30, -18, -10);
            _policy = CreateText(rightPanel, "Policy", "Policy Log: правило ещё не просмотрено.", 14, _amber, TextAnchor.LowerLeft, new Vector2(18, 108), new Vector2(-18, 140));
            CreateText(rightPanel, "ConfigurationHeading", "ПРОШИВКА И МОДИФИКАТОРЫ", 15, _cyan, TextAnchor.UpperLeft, new Vector2(18, -236), new Vector2(-18, -262));
            _configuration = CreateText(rightPanel, "Configuration", "Конфигурация: чтение текущего состояния…", 14, new Color(.88f, .91f, .92f), TextAnchor.UpperLeft, new Vector2(18, -270), new Vector2(-18, -352));
            var firmware = CreateButton(rightPanel, "NextFirmware", "ПРОШИВКА: СМОТРЕТЬ СЛЕДУЮЩУЮ", PreviewNextFirmware);
            Stretch(firmware.GetComponent<RectTransform>(), 0, 1, 1, 1, 18, -372, -18, -412);
            var sensorModifier = CreateButton(rightPanel, "NextSensorModifier", "СЕНСОР: СМОТРЕТЬ СЛЕДУЮЩИЙ", PreviewNextSensorModifier);
            Stretch(sensorModifier.GetComponent<RectTransform>(), 0, 1, 1, 1, 18, -420, -18, -460);
            var routeModifier = CreateButton(rightPanel, "NextRouteModifier", "МАРШРУТ: СМОТРЕТЬ СЛЕДУЮЩИЙ", PreviewNextRouteModifier);
            Stretch(routeModifier.GetComponent<RectTransform>(), 0, 1, 1, 1, 18, -468, -18, -508);
            var commitConfiguration = CreateButton(rightPanel, "CommitConfiguration", "ПРИМЕНИТЬ ПРОСМОТРЕННОЕ", CommitConfiguration);
            Stretch(commitConfiguration.GetComponent<RectTransform>(), 0, 1, 1, 1, 18, -524, -18, -564);

            var settings = CreatePanel(canvasRoot.transform, "Accessibility", _slate);
            Stretch(settings, 0, 0, 0, 0, 28, 24, 330, 174);
            CreateText(settings, "Heading", "ДОСТУПНОСТЬ", 16, _cyan, TextAnchor.UpperLeft, new Vector2(18, -12), new Vector2(-18, -38));
            _reducedMotion = CreateToggle(settings, "ReducedMotion", "Снизить движение", 0);
            _lowSensory = CreateToggle(settings, "LowSensory", "Low-sensory режим", 1);
            _reducedMotion.onValueChanged.AddListener(_ => ApplyAccessibility());
            _lowSensory.onValueChanged.AddListener(_ => ApplyAccessibility());

            _archive = CreateText(canvasRoot.transform, "Archive", "АРХИВ: первый поток открыт", 14, new Color(.88f, .91f, .92f), TextAnchor.LowerRight, new Vector2(1300, 28), new Vector2(-28, 72));
            BuildOnboarding(canvasRoot.transform);
            Render(_driver.CurrentSnapshot);
        }

        private void BuildOnboarding(Transform canvasRoot)
        {
            var overlay = CreateImage(canvasRoot, "OnboardingOverlay", new Color(.015f, .03f, .05f, .94f));
            Stretch(overlay.rectTransform, 0, 0, 1, 1, 0, 0, 0, 0);
            _onboardingOverlay = overlay.gameObject;
            var card = CreatePanel(overlay.transform, "OnboardingCard", _slate);
            Stretch(card, .5f, .5f, .5f, .5f, -470, -272, 470, 272);
            CreateText(card, "Eyebrow", "ТЕРМОСТАТ Т‑3 · НАБЛЮДАТЕЛЬНАЯ СИСТЕМА", 15, _cyan, TextAnchor.UpperLeft, new Vector2(32, -32), new Vector2(-32, -58));
            _onboardingHeadline = CreateText(card, "Headline", string.Empty, 31, _amber, TextAnchor.UpperLeft, new Vector2(32, -82), new Vector2(-32, -134));
            _onboardingBody = CreateText(card, "Body", string.Empty, 19, new Color(.90f, .93f, .94f), TextAnchor.UpperLeft, new Vector2(32, -154), new Vector2(-32, -310));
            _onboardingContinue = CreateButton(card, "Continue", "ПРОДОЛЖИТЬ", AdvanceOnboarding);
            Stretch(_onboardingContinue.GetComponent<RectTransform>(), 0, 0, .62f, 0, 32, 34, -8, -22);
            var skip = CreateButton(card, "Skip", "ПЕРЕЙТИ К ВИТРИНЕ", StartSessionFromOnboarding);
            Stretch(skip.GetComponent<RectTransform>(), .62f, 0, 1, 0, 8, 34, -32, -22);
            RenderOnboardingStep();
        }

        private void AdvanceOnboarding()
        {
            if (_onboardingStep < 2)
            {
                _onboardingStep++;
                RenderOnboardingStep();
                return;
            }
            StartSessionFromOnboarding();
        }

        private void RenderOnboardingStep()
        {
            if (_onboardingHeadline == null || _onboardingBody == null || _onboardingContinue == null) return;
            if (_onboardingStep == 0)
            {
                _onboardingHeadline.text = "Дом показывает следы, а не людей.";
                _onboardingBody.text = "Т‑3 наблюдает за воздухом, влагой, поверхностью и контурами. Он не ставит диагнозы жильцам и не управляет их действиями. Ваш выбор меняет только маршруты дома — и оставляет читаемую цену.";
                SetRouteButtonLabel(_onboardingContinue, "ПРОДОЛЖИТЬ");
            }
            else if (_onboardingStep == 1)
            {
                _onboardingHeadline.text = "Ищите два независимых предвестника.";
                _onboardingBody.text = "Каждый риск приходит не внезапно: датчики дают цвет, форму и подпись. Слой можно переключить слева; low-sensory и reduced motion не убирают смысл, только меняют подачу.";
                SetRouteButtonLabel(_onboardingContinue, "ПОКАЗАТЬ ВЫБОР");
            }
            else
            {
                _onboardingHeadline.text = "Маршрут — это не правильный ответ.";
                _onboardingBody.text = "Быстрый и бережный пути несут разные наблюдаемые последствия. После решения загляните в Journal: Т‑3 сохранит след, а дом продолжит день с новым baseline.";
                SetRouteButtonLabel(_onboardingContinue, "НАЧАТЬ ДЕНЬ");
            }
        }

        private void StartSessionFromOnboarding()
        {
            _driver.StartSession();
            if (_onboardingOverlay != null) _onboardingOverlay.SetActive(false);
        }

        private void Render(SimulationSnapshot snapshot)
        {
            if (snapshot == null || _status == null) return;
            _status.text = $"Т‑3 · {ChainTitle(snapshot.Event.ActiveChainId)} · {SensorLabel(_sensor)} · Фаза: {PhaseLabel(snapshot.Event.Phase)} · тик {snapshot.Tick}";
            _diagnostics.text = snapshot.Reasons.Count == 0
                ? "Причины: ожидание материального следа."
                : "Причины:\n" + string.Join("\n", snapshot.Reasons.Take(2).Select(x => "• " + LocalizeReason(x.Key)));
            _caption.text = CaptionFor(snapshot, _sensor);
            if (_sensorWash != null)
            {
                var wash = SensorColor(_sensor);
                wash.a = snapshot.LowSensory ? .04f : .12f;
                _sensorWash.color = wash;
            }
            _archive.text = snapshot.Archive.UnlockedEntries.Count == 0
                ? "ЖУРНАЛ: наблюдение началось; след ещё не завершён."
                : "ЖУРНАЛ: " + string.Join(" · ", snapshot.Archive.UnlockedEntries.Take(3).Select(ArchiveLabel)) + (string.IsNullOrWhiteSpace(snapshot.Event.LastOutcomeKey) ? string.Empty : "\nПоследствие: " + OutcomeLabel(snapshot.Event.LastOutcomeKey));
            UpdateRouteChoices(snapshot);
            UpdateConfigurationSummary(snapshot);
        }

        private void CommitPrimaryRoute()
        {
            var chain = _driver.CurrentSnapshot.Event.ActiveChainId;
            if (chain == "event.silver_corridor") _driver.SetRoute("route.drain_quiet", .56f);
            else if (chain == "event.blackout_return") _driver.SetRoute("route.quiet_middle", .56f);
            else _driver.SetRoute("route.direct_lower", .72f);
        }

        private void CommitSecondaryRoute()
        {
            var chain = _driver.CurrentSnapshot.Event.ActiveChainId;
            if (chain == "event.silver_corridor") _driver.SetRoute("route.direct_lower", .68f);
            else if (chain == "event.blackout_return") _driver.SetRoute("route.direct_lower", .68f);
            else _driver.SetRoute("route.quiet_middle", .56f);
        }

        private void UpdateRouteChoices(SimulationSnapshot snapshot)
        {
            if (_routeA == null || _routeB == null) return;
            if (snapshot.Event.ActiveChainId == "event.silver_corridor")
            {
                SetRouteButtonLabel(_routeA, "ДРЕНАЖ: разделить влагу · медленнее");
                SetRouteButtonLabel(_routeB, "ОБМЕН: быстрее · очередь и шум");
            }
            else if (snapshot.Event.ActiveChainId == "event.blackout_return")
            {
                SetRouteButtonLabel(_routeA, "ПОЭТАПНО: вернуть контуры · медленнее");
                SetRouteButtonLabel(_routeB, "СРАЗУ: быстрый возврат · второй пик");
            }
            else
            {
                SetRouteButtonLabel(_routeA, "НИЖНИЙ: быстрее · резонанс ветви 26");
                SetRouteButtonLabel(_routeB, "СРЕДНИЙ: тише · медленнее");
            }
        }

        private static void SetRouteButtonLabel(Button button, string value)
        {
            var label = button.GetComponentInChildren<Text>();
            if (label != null) label.text = value;
        }

        private void SelectSensor(SensorMode sensor)
        {
            _sensor = sensor;
            Render(_driver.CurrentSnapshot);
        }

        private void PreviewNextFirmware()
        {
            _candidateFirmware = NextOf(_candidateFirmware, "firmware.surface_memory", "firmware.air_first", "firmware.quiet_window");
            _lastConfigurationPreview = _driver.PreviewFirmware(_candidateFirmware);
            ShowConfigurationPreview(_lastConfigurationPreview);
        }

        private void PreviewNextSensorModifier()
        {
            _candidateSensorModifier = NextOf(_candidateSensorModifier, "modifier.early_contour", "modifier.moisture_stipple");
            _lastConfigurationPreview = _driver.PreviewModifier(_candidateSensorModifier, ModifierChannel.Sensor);
            ShowConfigurationPreview(_lastConfigurationPreview);
        }

        private void PreviewNextRouteModifier()
        {
            _candidateRouteModifier = NextOf(_candidateRouteModifier, "modifier.soft_open", "modifier.direct_boost");
            _lastConfigurationPreview = _driver.PreviewModifier(_candidateRouteModifier, ModifierChannel.Route);
            ShowConfigurationPreview(_lastConfigurationPreview);
        }

        private void CommitConfiguration()
        {
            if (_lastConfigurationPreview == null || _lastConfigurationPreview.Status != PolicyDecisionStatus.Valid || _driver.CurrentSnapshot.Tick > _lastConfigurationPreview.StaleAtTick)
            {
                _policy.text = "Policy Log: сначала просмотрите актуальную конфигурацию. Т‑3 не применяет устаревший выбор.";
                return;
            }
            if (_lastConfigurationPreview.ModifierChannel.HasValue) _driver.SelectModifier(_lastConfigurationPreview.SelectionId, _lastConfigurationPreview.ModifierChannel.Value);
            else _driver.SelectFirmware(_lastConfigurationPreview.SelectionId);
            _policy.text = "Policy Log: конфигурация поставлена в очередь. Следующий тик сохранит видимый компромисс.";
        }

        private void UpdateConfigurationSummary(SimulationSnapshot snapshot)
        {
            if (_configuration == null) return;
            _configuration.text = "Активно: " + ConfigurationTitle(snapshot.Policy.FirmwareId) + "\n" + ConfigurationTitle(snapshot.Policy.SensorModifierId) + " · " + ConfigurationTitle(snapshot.Policy.RouteModifierId);
        }

        private void ShowConfigurationPreview(ConfigurationPreviewDTO preview)
        {
            if (_configuration == null || preview == null) return;
            _configuration.text = "Просмотр: " + ConfigurationTitle(preview.SelectionId) + "\nЭффект: " + ConfigurationEffect(preview.EffectKey) + "\nЦена: " + ConfigurationEffect(preview.TradeoffKey) + (string.IsNullOrWhiteSpace(preview.AlternativeKey) ? string.Empty : "\nОбход: " + ConfigurationEffect(preview.AlternativeKey));
        }

        private static string NextOf(string current, params string[] ids)
        {
            var index = Array.IndexOf(ids, current);
            return ids[(index + 1 + ids.Length) % ids.Length];
        }

        private void PreviewPolicy()
        {
            _lastPolicyPreview = _driver.PreviewPolicy("policy.surface_shade_until_falling");
            _policy.text = $"Policy Log: {PolicyStatus(_lastPolicyPreview.Status)}\nПричина: {LocalizeReason(_lastPolicyPreview.ReasonKey)}\nСтоп: {_lastPolicyPreview.StopConditionKey}";
        }

        private void CommitPolicy()
        {
            if (_lastPolicyPreview != null && _lastPolicyPreview.Status == PolicyDecisionStatus.Valid)
            {
                _driver.CommitPolicy(_lastPolicyPreview.RuleId);
                _policy.text = "Policy Log: правило добавлено. Т‑3 покажет каждое срабатывание.";
            }
            else
            {
                _policy.text = "Policy Log: сначала проверьте правило. При блокировке Т‑3 покажет безопасный обход.";
            }
        }

        private void ApplyAccessibility()
        {
            _driver.SetAccessibility(_reducedMotion.isOn, _lowSensory.isOn);
        }

        private static Color SensorColor(SensorMode sensor)
        {
            return sensor == SensorMode.Heat ? new Color(.89f, .54f, .18f) : sensor == SensorMode.Air ? new Color(.55f, .84f, .91f) : sensor == SensorMode.Vibration ? new Color(.71f, .37f, .20f) : sensor == SensorMode.Moisture ? new Color(.75f, .85f, .88f) : sensor == SensorMode.Network ? new Color(.42f, .74f, .84f) : new Color(.76f, .64f, .40f);
        }

        private static string ChainTitle(string chain)
        {
            return chain == "event.silver_corridor" ? "СЕРЕБРЯНЫЙ КОРИДОР" : chain == "event.blackout_return" ? "НОЧНОЙ ВОЗВРАТ" : chain == "prologue.open_door" ? "ПОРОГ АРКАДИЯ" : "ДОМ В ПАУЗЕ";
        }

        private static string SensorLabel(SensorMode sensor)
        {
            return sensor == SensorMode.Heat ? "ТЕПЛО" : sensor == SensorMode.Air ? "ВОЗДУХ" : sensor == SensorMode.Vibration ? "ВИБРАЦИЯ" : sensor == SensorMode.Moisture ? "ВЛАГА" : sensor == SensorMode.Network ? "СЕТЬ" : "ПОВЕРХНОСТЬ";
        }

        private static string PhaseLabel(EventPhase phase)
        {
            return phase == EventPhase.Foreshadow ? "предвестник" : phase == EventPhase.Warning ? "внимание" : phase == EventPhase.Active ? "активный след" : phase == EventPhase.Aftermath ? "новый baseline" : "ожидание";
        }

        private static string ConfigurationTitle(string key)
        {
            return key == "firmware.surface_memory" ? "Surface Memory" : key == "firmware.air_first" ? "Air First" : key == "firmware.quiet_window" ? "Quiet Window" : key == "modifier.early_contour" ? "Ранний контур" : key == "modifier.moisture_stipple" ? "Серебряный стиппл" : key == "modifier.soft_open" ? "Мягкое открытие" : key == "modifier.direct_boost" ? "Прямой импульс" : key;
        }

        private static string ConfigurationEffect(string key)
        {
            return key == "firmware.surface_memory.effect.surface_lag" ? "сначала поднимает след поверхности" : key == "firmware.surface_memory.cost.slower_response" ? "реакция маршрута медленнее" : key == "firmware.air_first.effect.air_foreground" ? "сначала поднимает воздух у порога" : key == "firmware.air_first.cost.moisture_less_prominent" ? "влага не получает приоритета" : key == "firmware.quiet_window.effect.rhythm_foreground" ? "сначала показывает тихое окно" : key == "firmware.quiet_window.cost.slower_route_switch" ? "переключение требует больше времени" : key == "modifier.early_contour.effect.surface_contour" ? "контур поверхности появляется раньше" : key == "modifier.early_contour.cost.more_surface_signals" ? "поверхностных сигналов больше" : key == "modifier.moisture_stipple.effect.moisture_stipple" ? "влага получает штриховой след" : key == "modifier.moisture_stipple.cost.air_signal_less_prominent" ? "воздушный сигнал менее заметен" : key == "modifier.soft_open.effect.cap_direct_open" ? "ограничивает прямое открытие" : key == "modifier.soft_open.cost.slower_threshold_recovery" ? "порог восстанавливается медленнее" : key == "modifier.direct_boost.effect.raise_direct_open" ? "поднимает прямой маршрут" : key == "modifier.direct_boost.cost.branch_resonance" ? "резонанс ветви 26 заметнее" : key == "configuration.already_selected" ? "эта конфигурация уже активна" : key == "configuration.unknown" ? "выбор не входит в каталог" : key == "configuration.alternative.select_known_firmware" || key == "configuration.alternative.select_known_modifier" ? "выберите запись из локального каталога" : key == "configuration.alternative.safe_content_only" ? "используйте безопасный data-driven content" : key;
        }

        private static string PolicyStatus(PolicyDecisionStatus status)
        {
            return status == PolicyDecisionStatus.Valid ? "можно закрепить" : status == PolicyDecisionStatus.Blocked ? "Governor остановил" : status == PolicyDecisionStatus.Superseded ? "условие уже завершено" : "ожидает контекста";
        }

        private static string CaptionFor(SimulationSnapshot snapshot, SensorMode sensor)
        {
            if (snapshot.LowSensory) return snapshot.Event.ActiveChainId == "event.silver_corridor" ? "Подпись low-sensory: влага остаётся в кухонном контуре; дренаж меняет цену времени." : snapshot.Event.ActiveChainId == "event.blackout_return" ? "Подпись low-sensory: сеть возвращается по контурам; быстрый маршрут несёт второй пик." : "Подпись low-sensory: у порога холоднее, а маршрут меняет цену ветви и тихого окна.";
            if (snapshot.Event.ActiveChainId == "event.silver_corridor") return sensor == SensorMode.Moisture ? "Подпись: серебряный след держится дольше температуры." : "Подпись: дренаж отмечает лишний удар; маршрут отделяет влагу от спешки.";
            if (snapshot.Event.ActiveChainId == "event.blackout_return") return sensor == SensorMode.Network ? "Подпись: сетевой ритм вернулся; контуры просят порядка." : "Подпись: поверхность держит резерв, пока сеть не возвращается целиком.";
            return sensor == SensorMode.Heat ? "Подпись: холод входит через порог; янтарный поток отвечает из нижнего стояка." : sensor == SensorMode.Air ? "Подпись: стрелки показывают направление, а не силу в цифрах." : sensor == SensorMode.Vibration ? "Подпись: сегменты ветви 26 предупреждают о старте и остановке." : sensor == SensorMode.Moisture ? "Подпись: серебряный след держится дольше температуры." : sensor == SensorMode.Network ? "Подпись: сеть показывает очередь, не состояние людей." : "Подпись: поверхность помнит свет и холод дольше воздуха.";
        }

        private static string LocalizeReason(string key)
        {
            return key == "reason.external_air_at_threshold" ? "у порога внешний воздух" : key == "reason.start_stop" ? "ветвь 26 часто стартует и останавливается" : key == "reason.quiet_window" ? "маршрут пересекает тихое окно" : key == "reason.temperature_delta" ? "перепад между стояком и порогом" : key == "reason.moisture_residual" ? "влага не ушла из контура" : key == "governor.protective_lockout" ? "защитный режим компонента" : key;
        }

        private static string ArchiveLabel(string key)
        {
            return key == "archive.first_flow" ? "первый поток" : key == "archive.threshold_route" ? "порог" : key == "archive.quiet_route" ? "тихий маршрут" : key == "archive.silver_corridor" ? "серебряный коридор" : key == "archive.staged_return" ? "поэтапный возврат" : key == "archive.day_complete" ? "день собран" : key;
        }

        private static string OutcomeLabel(string key)
        {
            return key == "cost.branch_26_resonance" ? "ветви 26 понадобится окно восстановления" : key == "cost.kitchen_queue" ? "кухонный контур сохранил очередь" : key == "cost.second_network_peak" ? "сеть оставила след второго пика" : key == "baseline.day_complete" ? "дом получил восстанавливаемый ночной baseline" : ArchiveLabel(key);
        }

        private static void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() != null) return;
            new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
        }

        private static Image CreateImage(Transform parent, string name, Color color)
        {
            var gameObject = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image));
            gameObject.transform.SetParent(parent, false);
            var image = gameObject.GetComponent<Image>();
            image.color = color;
            return image;
        }

        private static RectTransform CreatePanel(Transform parent, string name, Color color) => CreateImage(parent, name, color).rectTransform;

        private static Text CreateText(Transform parent, string name, string content, int size, Color color, TextAnchor anchor, Vector2 minOffset, Vector2 maxOffset)
        {
            var gameObject = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Text));
            gameObject.transform.SetParent(parent, false);
            var text = gameObject.GetComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.text = content;
            text.fontSize = size;
            text.color = color;
            text.alignment = anchor;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            var rect = text.rectTransform;
            Stretch(rect, 0, 0, 1, 1, minOffset.x, minOffset.y, maxOffset.x, maxOffset.y);
            return text;
        }

        private Button CreateButton(Transform parent, string name, string label, Action onClick)
        {
            var image = CreateImage(parent, name, new Color(.10f, .19f, .23f, .94f));
            var button = image.gameObject.AddComponent<Button>();
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1f, .86f, .60f, 1f);
            colors.pressedColor = new Color(.60f, .92f, .98f, 1f);
            button.colors = colors;
            CreateText(image.transform, "Label", label, 14, Color.white, TextAnchor.MiddleCenter, new Vector2(8, 5), new Vector2(-8, -5));
            button.onClick.AddListener(() => onClick());
            return button;
        }

        private Toggle CreateToggle(Transform parent, string name, string label, int index)
        {
            var gameObject = new GameObject(name, typeof(RectTransform), typeof(Toggle));
            gameObject.transform.SetParent(parent, false);
            var toggle = gameObject.GetComponent<Toggle>();
            Stretch(toggle.GetComponent<RectTransform>(), 0, 1, 1, 1, 18, -56 - index * 42, -18, -90 - index * 42);
            var box = CreateImage(gameObject.transform, "Box", new Color(.10f, .19f, .23f, 1f));
            Stretch(box.rectTransform, 0, .5f, 0, .5f, 0, -12, 24, 12);
            var check = CreateImage(box.transform, "Check", _amber);
            Stretch(check.rectTransform, .2f, .2f, .8f, .8f, 0, 0, 0, 0);
            var labelText = CreateText(gameObject.transform, "Label", label, 14, Color.white, TextAnchor.MiddleLeft, new Vector2(34, -16), new Vector2(-2, 16));
            toggle.targetGraphic = box;
            toggle.graphic = check;
            return toggle;
        }

        private static void Stretch(RectTransform rect, float anchorMinX, float anchorMinY, float anchorMaxX, float anchorMaxY, float left, float bottom, float right, float top)
        {
            rect.anchorMin = new Vector2(anchorMinX, anchorMinY);
            rect.anchorMax = new Vector2(anchorMaxX, anchorMaxY);
            rect.offsetMin = new Vector2(left, bottom);
            rect.offsetMax = new Vector2(right, top);
        }
    }
}
