import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for large inputs/outputs
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini API Client
// Note: User-Agent set to 'aistudio-build' for telemetry as required
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 2. Stories preloaded / default template endpoint
app.get("/api/stories/preloaded", (req, res) => {
  res.json({
    stories: [
      {
        id: "midnight-castle",
        title: "午夜古堡的低语 (The Midnight Castle)",
        description: "一个经典的中世纪哥特风恐怖冒险。你是一名误入古堡的旅人，必须寻找古老的符文钥匙来逃离吞噬灵魂的阴影。",
        author: "系统管理员",
        initialNodeId: "start",
        variables: [
          { name: "health", type: "number", value: "100" },
          { name: "has_key", type: "boolean", value: "false" },
          { name: "sanity", type: "number", value: "80" }
        ],
        nodes: [
          {
            id: "start",
            text: "夜色渐浓，暴雨如注。你推开尘封数纪元的古老橡木门，闪电撕裂夜空，苍白的强光瞬间照亮了由巨石砌就的大厅。墙角布满蛛网，空气中弥漫着霉味和铁锈的气息。大理石走廊前铺着一条褪色的红地毯，两侧深邃的侧室黑洞洞得如同怪兽张开的大口。",
            imagePrompt: "Interior of an ancient gothic stone castle lobby at night, a heavy wooden entrance door, cobwebs in corners, brilliant lightning visible through high stained windows, photorealistic, cinematic lighting, dramatic mood",
            choices: [
              {
                text: "沿着闪电映射的红地毯大堂向前探索",
                nextNodeId: "hallway_center"
              },
              {
                text: "进入左侧落满灰尘的阴暗书房",
                nextNodeId: "library_room"
              },
              {
                text: "试图关上并反锁沉重的橡木门先作休息",
                nextNodeId: "door_locked_trap",
                variableEffect: { name: "sanity", operation: "add", value: "-10" }
              }
            ]
          },
          {
            id: "door_locked_trap",
            text: "当你转过身，用力试图把巨型门栓拉上。突然，门栓上生满的倒刺划破了你的手，同时沉闷的耳语在耳畔响起：'进门者，无生路。' 恐怖的低语直击灵魂，你感到精神极度紧张恐惧，随后铜制把手自动融化，退路彻底断绝。",
            imagePrompt: "A close-up of a weathered gothic library and door lock melting like black wax under shadow aura, digital art, dark fantasy",
            choices: [
              {
                text: "捂着受伤手掌，退缩并走向大堂深处",
                nextNodeId: "hallway_center"
              },
              {
                text: "大声叫喊寻求回应，闯入隔壁书房",
                nextNodeId: "library_room"
              }
            ]
          },
          {
            id: "library_room",
            text: "书房里堆满了腐败的手稿。你看到一个发光的红玛瑙雕刻置于书桌中央，旁边躺着一具早已风化的骑士骸骨，骸骨手中似乎抓着一把闪闪发光的金属铜匙。书架深处仿佛有扭曲的身影在黑暗中蠕动。",
            imagePrompt: "A dusty gothic library room, ancient manuscript books piled up, a skeleton of a knight clutching a metal key, a glowing red gem on a center desk, volumetric lighting, unreal engine render",
            choices: [
              {
                text: "拾取骑士留下的‘黄铜钥匙’",
                nextNodeId: "library_take_key",
                variableEffect: { name: "has_key", operation: "set", value: "true" }
              },
              {
                text: "贪婪地夺取中间闪光的红玛瑙雕刻",
                nextNodeId: "ruby_trap",
                variableEffect: { name: "health", operation: "add", value: "-30" }
              },
              {
                text: "不碰任何东西，警惕地退回走廊大堂",
                nextNodeId: "hallway_center"
              }
            ]
          },
          {
            id: "library_take_key",
            text: "你小心翼翼地把黄铜钥匙从骑士冰冷的手骨中抽离。咔哒一声，骸骨竟然发出了一阵沉重的叹息，但并未动弹。钥匙入手沉甸甸的，散发着阵阵古朴的微光。你获得了古堡的至关道具！",
            imagePrompt: "A hand lifting an old detailed brass key from dusty skeletal fingers, close-up shot, fantasy realism, depth of field",
            choices: [
              {
                text: "握紧钥匙，转身迅速前往大厅前方的长廊",
                nextNodeId: "hallway_center"
              }
            ]
          },
          {
            id: "ruby_trap",
            text: "当你触碰到红玛瑙的瞬间，滚烫的灼烧感瞬间爬满全身！雕刻中附带的古代诅咒魔火爆发，将你的皮肉烧焦。你发出痛苦的惨叫，强烈的反噬几乎将你摧毁，你损失了大量生命，精神也受到了重创！",
            imagePrompt: "An ancient glowing ruby magical jewel releasing crackling fiery red energy arcs upon a painful grasp, magical fantasy art",
            choices: [
              {
                text: "忍痛扔下红玛瑙，拾起地上的黄铜钥匙，匆忙退逃",
                nextNodeId: "library_take_key",
                variableEffect: { name: "health", operation: "add", value: "-10" }
              },
              {
                text: "拖着重度烧伤的残破身体，仓皇逃回大理石走廊",
                nextNodeId: "hallway_center"
              }
            ]
          },
          {
            id: "hallway_center",
            text: "你矗立在大理石走廊前。长廊的中段，一扇紧闭的坚固黄金雕花大门阻隔了去路。门盘根错节盘旋着诡异的守护符文，中间有一个锁孔；如果绕开此门，长廊尽头则有一道狭窄陡峭的台阶通向未知的古堡地牢。",
            imagePrompt: "A long dimly lit marble gothic castle corridor leading to a massive golden engraved portal door with magic rune seal, high resolution fantasy render",
            choices: [
              {
                text: "使用黄铜钥匙，试着解锁黄金符文大门",
                nextNodeId: "gate_unlocked_win",
                condition: { name: "has_key", comparator: "eq", value: "true" }
              },
              {
                text: "强行撞门或破坏黄金符文锁",
                nextNodeId: "gate_smash_fail",
                condition: { name: "has_key", comparator: "eq", value: "false" }
              },
              {
                text: "放弃这扇门，沿着阴冷陡峭的石阶下往地牢",
                nextNodeId: "dungeon_descent"
              }
            ]
          },
          {
            id: "gate_smash_fail",
            text: "你对门锁连踢带撞，大门纹丝不动。突然，黄金门扉上的符文骤然亮起刺骨的电光！符文反震法阵瞬间发动，一道狂暴的雷击将你整个人轰飞出去，由于没有任何防备，你的生命值近乎枯竭，全身麻痹倒在地上颤抖...",
            imagePrompt: "Intense blue magical electricity blasting outward from an ancient door rune shield, beautiful dark dynamic illustration",
            choices: [
              {
                text: "在神志丧失前，挣扎着爬向阴森的地牢阶梯",
                nextNodeId: "dungeon_descent"
              },
              {
                text: "绝望地闭上双眼，等待着恐怖黑暗将自己吞噬",
                nextNodeId: "game_silent_end"
              }
            ]
          },
          {
            id: "dungeon_descent",
            text: "长廊尽头，你踩着湿滑的苔藓石阶走入地牢。地牢里散落着锈迹斑斑刑具和铁笼，阴冷的墙根下站着一个披着黑袍的幽灵商贩，他的兜帽下竟是一片虚无鬼火！他看到你，不怀好意地讪笑，表示愿意用你的灵魂，兑换一瓶散发邪恶气息的生命复苏药剂。",
            imagePrompt: "A spooky dark dungeon jail with rust iron cages, a glowing eyes phantom merchant in black robes holding a dark glowing draft bottle, fantasy lighting",
            choices: [
              {
                text: "用狂躁的精神换取商人的秘药以恢复生命",
                nextNodeId: "merchant_deal",
                variableEffect: { name: "health", operation: "set", value: "100" }
              },
              {
                text: "嗅到了邪恶阴谋，拔腿冲向地牢幽黑的最深处通道",
                nextNodeId: "abyss_pit"
              }
            ]
          },
          {
            id: "merchant_deal",
            text: "你一口干掉那个装载着灰蒙液体的瓶子，灼烧的疼痛过后，你身上的伤痕迅速愈合！但取而代之的是极致的疯狂。在商人的讥笑中，你睁大无神且充血的双眼，神智（Sanity）几乎完全崩溃，成为游荡在古堡丧失心智的前行尸肉...",
            imagePrompt: "A corrupted pale human face with black veins and fully black glowing eyes looking insane, gothic horror art style",
            choices: [
              {
                text: "游荡在黑暗地牢永无天日 (游戏失败)",
                nextNodeId: "game_insanity_end"
              }
            ]
          },
          {
            id: "abyss_pit",
            text: "由于黑暗无光且过度慌乱，地牢最深处没有平坦的地面——前面竟然是一处深不见底的万丈深渊！你由于速度太快无法刹车，一脚踩空，耳边只剩呼呼的风声，笔直坠入了永世的死寂深渊中...",
            imagePrompt: "A helpless adventurer falling deep into a dark bottomless stone rocky abyss crater surrounded by skull carvings, concept design",
            choices: [
              {
                text: "在无尽的坠落中迎来终结 (游戏失败)",
                nextNodeId: "game_fall_end"
              }
            ]
          },
          {
            id: "gate_unlocked_win",
            text: "你颤抖地掏出那枚散发着古朴微光的黄铜钥匙，精准地伸进了黄金大门中央的锁孔。伴随令人释怀的咯噔转动声，笼罩大门的魔法红印缓缓化为了漫天星屑散去！古老大门应声而开，外面吹来了清新的雨后森林野花芬芳，不远处晨曦破晓，晨光微亮——你成功逃脱了可怕的诅咒古堡！",
            imagePrompt: "A magnificent opening golden palace door shining with white pure light rays looking out onto a beautiful morning forest and rising sun, epic hopeful painting",
            choices: [] // Terminal Node (Winner End)
          },
          {
            id: "game_silent_end",
            text: "你耗尽了最后一丝精力，身体倒在冰凉的大理石地板上。古堡里的黑雾静悄悄地缠上你虚弱的身躯，将你拉入永无光明的沉睡。你成为了它无数个静默灵魂藏品之一。",
            imagePrompt: "A dark mystical smoky silhouette consuming a laying knight adventurer, highly atmospheric oil painting",
            choices: [] // Terminal Node
          },
          {
            id: "game_insanity_end",
            text: "肉体虽已恢复，但你的灵魂早已抵押给幽冥商人。你在腐烂的地牢里漫无目的地行走，不再记得自己是谁，为什么进来，只偶尔对着紧闭的铁门发出野兽般的低吼。",
            imagePrompt: "A hollow broken hollow-like zombie roaming dark stone dungeons, stylized concept fantasy illustration",
            choices: [] // Terminal Node
          },
          {
            id: "game_fall_end",
            text: "重力无情地带走了你的一生。在一声剧烈的闷响中，一切思考和痛楚随风逝去，徒留古堡深渊又多了一段凄凉的旅人白骨传说。",
            imagePrompt: "A single glowing torch lying shattered in a pool of dim colors on stone bottom scattered bones, dramatic graphic illustration",
            choices: [] // Terminal Node
          }
        ]
      },
      {
        id: "cyberpunk-hacker",
        title: "赛博之网：零度入侵 (Cyberpunk: Zero Invasion)",
        description: "你是一名底层的赛博朋克黑客。为了还清累垮母亲的巨额医疗贷，你不得不接下一桩入侵超级企业「荒坂重工」量子数据库的黑契约。",
        author: "AI 创作者",
        initialNodeId: "start",
        variables: [
          { name: "credits", type: "number", value: "250" },
          { name: "decryption_keys", type: "number", value: "1" },
          { name: "security_alert", type: "number", value: "0" }
        ],
        nodes: [
          {
            id: "start",
            text: "霓虹雨夜，积水反射着全息广告牌的斑斓极光。你蜷缩在狭窄的黑客改装车里，后颈的神经接口传来一阵熟悉的微弱痛感。身前的全息控制面板正发出耀眼的幽蓝光芒，屏幕上赫然是「荒坂重工」中央防火墙的虚拟构造模型。指令已生成，你只有15秒行动时间。",
            imagePrompt: "A cyberpunk hacker inside a small cockpit of a futuristic car, neon-lit rainy futuristic city outside, multiple glowing blue holographic screens showing charts, wireframe models, neural jack interface connected to back of neck",
            choices: [
              {
                text: "启动定制版「破壁者」探针进行静默扫描破译",
                nextNodeId: "quiet_scan"
              },
              {
                text: "直接倾泻狂暴的「熔毁」溢出算法进行暴力压制",
                nextNodeId: "brute_force"
              }
            ]
          },
          {
            id: "quiet_scan",
            text: "探针无声无息地切入外围协议，屏幕上的进度条以跳跃的绿色字符缓慢上升。此时系统检测到了两条备用通路：一处是监控系统的备用节点（可能藏有解密辅助模块），另一条是核心数据库的最短连通管道但带有反入侵陷阱。",
            imagePrompt: "A green binary code digital matrix flowing nicely, matrix data terminal interface showing access paths, cyberpunk art style",
            choices: [
              {
                text: "转向破译监控备用节点，争取获取反追踪秘钥",
                nextNodeId: "monitoring_hack",
                variableEffect: { name: "decryption_keys", operation: "add", value: "1" }
              },
              {
                text: "追求极致速度，直接刺入核心数据库最短管道",
                nextNodeId: "database_core"
              }
            ]
          },
          {
            id: "monitoring_hack",
            text: "你成功潜入侧翼节点！在顺手瘫痪安保电子眼的瞬间，你在荒坂的核心存储区发现并在云盘同步了一份军用级核心解密矩阵。额外获得了 1 份黑入权限！此时，防入侵机制也已察觉了数据波动，警报等级正在急速上涨10个刻度！",
            imagePrompt: "Cyberpunk computer visual dashboard getting a holographic memory chip blueprint hack interface, orange alert glowing",
            choices: [
              {
                text: "拖着高负荷发热的脑部植入体，强行突破中央数据库",
                nextNodeId: "database_core"
              }
            ]
          },
          {
            id: "brute_force",
            text: "「熔毁」木马犹如数字猛兽轰击防火墙。巨额的算力甚至让你前额的散热片冒出了焦糊的轻烟，你瞬间撕开了一道缺口。但高额的行为模式直接引起了荒坂AI守卫「红蛛」的警惕。系统安全等级暴涨50%，车窗外隐隐传来智能警用无人机的呼啸警笛！",
            imagePrompt: "Cyberpunk red grid hacker battle with cybernetic red glowing spider legs representing security hunter daemon, explosive digital artifacting",
            choices: [
              {
                text: "不顾头痛，狂砸键盘，消耗 1 款解密钥匙强行越级解锁",
                nextNodeId: "database_core",
                condition: { name: "decryption_keys", comparator: "gte", value: "1" },
                variableEffect: { name: "decryption_keys", operation: "add", value: "-1" }
              },
              {
                text: "安全等级过高，立即切断网络神经连接撤退逃跑",
                nextNodeId: "abort_run",
                variableEffect: { name: "credits", operation: "add", value: "-150" }
              }
            ]
          },
          {
            id: "database_core",
            text: "你站在了荒坂量子中央机密大门前。四周是光怪陆离、呈半透明几何柱体排列的零度冷却数据立方。如果能将其中的绝密原型蓝图完整下载并传回黑帮，十万信用点指日可待。然而机房尽头已经锁定了你——「红蛛」守卫大军已呼啸而至。",
            imagePrompt: "A vast virtual cyber space containing grid of shining giant light-blue server racks and floating memory cubes, dynamic digital dimension",
            choices: [
              {
                text: "消耗 2 份解密钥匙瞬间越狱下载数据，以求毫秒级全身而退",
                nextNodeId: "perfect_escape_win",
                condition: { name: "decryption_keys", comparator: "gte", value: "2" }
              },
              {
                text: "没有足够钥匙！强行连通植入脑电波进行高功率强行解密",
                nextNodeId: "unsafe_download"
              }
            ]
          },
          {
            id: "unsafe_download",
            text: "你脑部发出剧烈烧灼感，算力过载导致双耳流血，但蓝图数据开始百分比上涨。在进度条跳满99%的瞬间，「红蛛」致命的代码闪烁，将你的视线轰然化为了一片惨淡绝望的血红...你的大脑因强电流彻底烧毁死机。",
            imagePrompt: "A futuristic hacker computer screen with a static noise error and bloody neural interface cords sparking, high tech tragedy",
            choices: [
              {
                text: "意识在虚拟深渊中消散 (进入死机结局)",
                nextNodeId: "death_braindead"
              }
            ]
          },
          {
            id: "abort_run",
            text: "你猛地扯下脖子后的电源线，伴随电火花闪烁，警笛声也由近至远消失。虽然任务泡汤，还因为黑市设备故障被扣除了150信用点。但你保全了一条性命，拍拍额头，继续在这个钢铁丛林般的反乌托邦都市里谋生。",
            imagePrompt: "A tired young cyber man smoking in alleyway holding cyber implants under dim yellow single lamp, dark heavy mood anime",
            choices: [] // Terminal Victory/Survived Node
          },
          {
            id: "perfect_escape_win",
            text: "两束闪烁的秘钥矩阵爆发出极速演算，大门锁瞬间清空！100%下载完毕，原型蓝图同步进你脑内的加密盘。数据流瞬间断开，你在AI反应前一秒将芯片塞进口袋。三天后，你的账户平空汇入十万信用点，你开着崭新的浮空摩托载着痊愈的母亲驶离贫民区！",
            imagePrompt: "A polished sleek flying vehicle flying over shiny gorgeous cyber metropolis city high-rises at sunrise, optimistic future cyberpunk aesthetic",
            choices: [] // Terminal Node Perfect Victory
          },
          {
            id: "death_braindead",
            text: "三天后，新闻主播以欢快的语调播报了「一起流浪汉在改装车内死于廉价脑芯片过热的意外事故」。在霓虹灯不灭的庞大废土巨都市，死掉一个底层黑客就像夜空中熄灭一粒微不足道的像素，无一人悼念。",
            imagePrompt: "A single glitching holographic memorial digital headstone inside trash alleyway, cold neon rain, cyberpunk background",
            choices: [] // Terminal Node
          }
        ]
      }
    ]
  });
});

// 3. Main AI integration POST point (Story creation node list generation with schemas)
app.post("/api/gemini/generate-story", async (req, res) => {
  const { prompt, sourceText, options } = req.body;

  if (!prompt && !sourceText) {
    return res.status(400).json({ error: "Missing prompt or sourceText in request body." });
  }

  try {
    const ai = getGeminiClient();

    const selectedModel = options?.model === "pro" ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    const language = options?.language || "中文";
    const style = options?.style || "immersive dark fantasy";
    const targetNodes = options?.targetNodes || 10;

    let targetPrompt = ``;
    if (sourceText) {
      targetPrompt = `
You must convert the following novel excerpt, play script, outline or description into an interactive branching narrative game matching the required JSON schema structure.
Source Material Content:
"""
${sourceText}
"""

User Focus/Direction: ${prompt || "Produce a natural expansion of the input material into an adventure branching story game."}
`;
    } else {
      targetPrompt = `Create a brand new interactive story branching game from scratch based on this idea: "${prompt}".`;
    }

    const systemInstruction = `You are an expert branching story narrative creator, visual concept director, and RPG systems designer.
Your goal is to parse and convert novels, stories, outline drafts, or creative core prompts into interactive branching text games matching our exact JSON Schema format.

Core Guidelines:
1. Language: You MUST output all JSON fields (title, description, author, nodes, texts, choices) in "${language}".
2. Aesthetic Vibe/Style: Keep the theme in line with "${style}".
3. Path Diversity: Setup at least ${targetNodes} nodes. There must be multiple interesting branches:
   - Make a clear starting node (ID: "start").
   - Include 2 to 4 branches per node.
   - Design at least 2 interesting failure paths/endings (e.g. traps, death nodes, traps requiring specific items or stats, that end the game).
   - Design at least 2 distinct successful resolution ending nodes (which have no choices inside them to denote victory).
   - All referenced nextNodeId fields in all choice arrays MUST match valid ID keys of nodes generated in the same document. Never create dead-end links or point to nonexistent node IDs.
4. Variables & RPG Integrity: Add 2 or 3 global variables inside 'variables' array (e.g., {"name": "health", "type": "number", "value": "100"}, {"name": "has_key", "type": "boolean", "value": "false"}).
   - Use 'variableEffect' inside choice objects to alter these variables (e.g. subtracting health, setting a key to true).
   - Use 'condition' objects inside choices (e.g. comparing if variablehealth >= 40, or has_key is true) so that those choices are unlocked and visible only if the player meets those conditions. This showcases the depth of the interactive system!
5. Visual Director: Generate extremely high-quality, vivid, cinematic, or stylized environment-only illustration prompts (imagePrompt) for each node. (e.g. 'high-angle view of a burning ancient archive room, flying embers, highly detailed cinematic concept art'). Avoid descriptions containing text, overlay symbols, or UI frames. Make the description highly photographic, aesthetic, or fantasy-concept-art.
6. Immersive Prose: Use immersive second-person perspective ('You do this...', 'You see...') for the narrative segment 'text' fields. Limit paragraphs to a vivid 100-250 characters.

Strictly adhere to the OpenAPI schema output definition. Make sure to generate all required fields.`;

    const storyResponseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title of the branching story" },
        description: { type: Type.STRING, description: "Short summary detailing the setting and narrative hooks" },
        author: { type: Type.STRING, description: "Author name or credit, e.g. AI Chronicler" },
        initialNodeId: { type: Type.STRING, description: "The starting node id, always 'start'" },
        variables: {
          type: Type.ARRAY,
          description: "Initial player variables used to track stats or item flags.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Unique variable identifier, e.g., 'health', 'gold', 'has_sword', 'reputation'" },
              type: { type: Type.STRING, description: "Type: 'number' or 'boolean'" },
              value: { type: Type.STRING, description: "Initial value representing variable state as string, e.g., '100' or 'false'" }
            },
            required: ["name", "type", "value"]
          }
        },
        nodes: {
          type: Type.ARRAY,
          description: `Adventure narrative scenes. Must contain a logical tree database from start to multiple terminal endings. Aim for exactly ${targetNodes} nodes.`,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique snake_case identifier, e.g., 'start', 'cave_entrance', 'combat_slime', 'deadly_pit', 'victory_chamber'" },
              text: { type: Type.STRING, description: "Vivid, second-person narrative scene segment in specified language." },
              imagePrompt: { type: Type.STRING, description: "Visual-rich, background art design text prompt for full-screen illustration generation." },
              choices: {
                type: Type.ARRAY,
                description: "Array of player paths. Leave empty for terminal ending scenes (death, success).",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "Interactive button choice label, e.g., 'Engage the dark entity' or 'Flee back to the sunlight'" },
                    nextNodeId: { type: Type.STRING, description: "The destination node id when clicked" },
                    variableEffect: {
                      type: Type.OBJECT,
                      description: "Modification to initial game variables.",
                      properties: {
                        name: { type: Type.STRING, description: "Target variable name to modify" },
                        operation: { type: Type.STRING, description: "Operation to perform: 'set' or 'add'" },
                        value: { type: Type.STRING, description: "Modification value as a text string, e.g., 'true' or '-25'" }
                      },
                      required: ["name", "operation", "value"]
                    },
                    condition: {
                      type: Type.OBJECT,
                      description: "Constraint checklist specifying under what conditions this choice is unlocked/displayed.",
                      properties: {
                        name: { type: Type.STRING, description: "Variable name checked" },
                        comparator: { type: Type.STRING, description: "'eq' or 'gte' or 'lte'" },
                        value: { type: Type.STRING, description: "Value to pass comparison check, e.g. 'true' or '50'" }
                      },
                      required: ["name", "comparator", "value"]
                    }
                  },
                  required: ["text", "nextNodeId"]
                }
              }
            },
            required: ["id", "text", "imagePrompt", "choices"]
          }
        }
      },
      required: ["title", "description", "author", "initialNodeId", "variables", "nodes"]
    };

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: targetPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: storyResponseSchema,
        temperature: 0.85,
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text yielded by Gemini API.");
    }

    const storyObject = JSON.parse(textOutput);
    res.json({ story: storyObject });
  } catch (err: any) {
    console.error("Gemini Story Generation Error: ", err);
    res.status(500).json({ error: err.message || "Failed to generate branching game JSON." });
  }
});

// 4. Scene background scene-art image generator endpoint using image generation skill guidelines
app.post("/api/gemini/generate-image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt for image generation." });
  }

  try {
    const ai = getGeminiClient();

    // Use gemini-2.5-flash-image model as default per skill guidelines
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `${prompt}, beautiful scenery art, digital painting, rich moody color atmosphere, wide shot, no characters, no text labels, game concept background illustration` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        }
      }
    });

    // Iterate through response parts to find the base64-encoded imagePart
    let base64Image = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("No image was returned by gemini-2.5-flash-image.");
    }

    res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
  } catch (err: any) {
    console.error("Gemini Image Generation Error: ", err);
    res.status(500).json({ error: err.message || "Failed to generate scene illustration." });
  }
});

// Serve frontend assets
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start custom Express server: ", err);
  process.exit(1);
});
