# Визуальный asset manifest

Все перечисленные изображения созданы специально для этого репозитория как оригинальные игровые ассеты. Они не содержат сторонних логотипов, брендовых персонажей или заимствованных фрагментов. До иного решения владельца на них распространяется корневой `LICENSE` проекта.

| Файл | Назначение | Runtime-путь | Формат и размер | WebGL-профиль |
|---|---|---|---|---|
| `Art/thermostat_cutaway_key_art.png` | Ключевой store/readme visual и художественный reference | Не загружается автоматически | PNG, 2560×1440 | Включать только в витринные страницы/marketing scene; не дублировать в Resources. |
| `Assets/Resources/Art/playable_house_cutaway.png` | Основной cutaway-бэкграунд playable showcase | `Resources/Art/playable_house_cutaway` | PNG, 2560×1440 | Импортировать как Sprite, max size 2048, ASTC/ETC2 при доступности платформы. |
| `Assets/Resources/Art/sensor_language_atlas.png` | Атлас шести non-colour sensor languages | `Resources/Art/sensor_language_atlas` | PNG, 1920×1920 | Импортировать как Sprite (multiple); каждый символ сохраняет shape/pattern redundancy. |
| `Assets/Resources/Art/journal_archive_background.png` | Фон Journal of Stewardship / Archive | `Resources/Art/journal_archive_background` | PNG, 2176×1632 | Импортировать как Sprite, max size 2048; использовать по запросу экрана. |

> **Доступность:** цвет не является единственным носителем смысла. Тепло — контурные кольца; воздух — направленные нити; вибрация — двойные сегменты; влага — капли/точки; сеть — связанные ячейки; поверхность — слоистая штриховка. Runtime UI дополнительно выводит подпись и semantic label.
