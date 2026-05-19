import { Story } from "./types";

export const defaultStory: Story = {
  title: "午夜古堡的惊魂 (Gothic Castle Escape)",
  description: "闪电照亮虚空的雨夜，一头由于避雨而误入吸血鬼古堡的旅人。你必须在精神崩溃或生命力衰竭前，找到隐藏的钥匙，并决定下一步的方向。",
  author: "系统推荐",
  initialNodeId: "start",
  variables: [
    { name: "health", type: "number", value: "100" },
    { name: "has_key", type: "boolean", value: "false" },
    { name: "sanity", type: "number", value: "80" }
  ],
  nodes: [
    {
      id: "start",
      text: "闪电撕裂漆黑的雨空。你推开尘封树百年的斑驳古堡大门，大步迈入。大厅阴森冰冷，寒风在走廊四周长啸。正前端平铺着一条暗红色的羊毛旧地毯，两端则连接着黑洞洞的书房与回音阵阵的地穴，你听到深处仿佛有扭曲之声发出。",
      imagePrompt: "Interior of an ancient gothic stone castle entrance hall at night, a heavy rotting wooden door, lightning crashing through broken stained glass windows, cinematic fantasy mood",
      choices: [
        {
          text: "沿着中间的暗红羊毛旧地毯大堂向前探索",
          nextNodeId: "hallway_center"
        },
        {
          text: "战战兢兢地迈入左侧充斥霉的书房",
          nextNodeId: "library_room"
        }
      ]
    },
    {
      id: "library_room",
      text: "落满飞尘的书房犹如死城。一具干枯骑士残骨倚靠在残破的书桌前，其指骨处似乎正死死抓着一把锈迹斑斑的黄铜古匙；房间中间一尊魔法咒刻的玛瑙石散发诱人红光。空气中的低语开始增加，你感到有些头疼心颤。",
      imagePrompt: "A dusty ancient castle reading room, rays of moonlight detailing a skeleton on a seat clutching a brass key, dark atmospheric, deep field depth",
      choices: [
        {
          text: "伸出双手，尝试抽取出骑士手中的‘黄铜钥匙’",
          nextNodeId: "library_take_key",
          variableEffect: { name: "has_key", operation: "set", value: "true" }
        },
        {
          text: "贪婪地据为己有：抢夺在魔法咒印中闪烁的玛瑙石",
          nextNodeId: "ruby_trap",
          variableEffect: { name: "health", operation: "add", value: "-30" }
        },
        {
          text: "不乱碰危险死物，立刻转步退出，走向大堂长廊",
          nextNodeId: "hallway_center"
        }
      ]
    },
    {
      id: "library_take_key",
      text: "当你触碰到那把金属钥匙时，它在你手中闪着一层淡淡的黄光，古老的指骨咔哒一响彻底风化。在钥匙入手的瞬间，你感觉这扇紧缩城堡的大锁已经对你网开一面。你获得了‘黄铜古匙’！",
      imagePrompt: "Close-up of a rustic metal glowing keys grasped by dusty human fingers, light flares, fine detail fantasy art",
      choices: [
        {
          text: "握紧古匙，急匆匆折往古堡大堂黄金门方向",
          nextNodeId: "hallway_center"
        }
      ]
    },
    {
      id: "ruby_trap",
      text: "当你贪婪的指尖触碰到那颗红宝石的瞬间，滚烫的远古烈焰反噬诅咒如闪电般传遍你脆弱的躯体！巨烈的手部灼伤将你的体格几乎挫伤殆尽，发出野兽般的哼叫，你遭受了重创...",
      imagePrompt: "A cursed glowing fiery ruby stone erupting with lethal red magic energy sparkles, fantasy concept art",
      choices: [
        {
          text: "忍痛扔下玛瑙，匆忙抽出骑士怀中的黄铜钥匙，灰溜溜出走",
          nextNodeId: "library_take_key"
        },
        {
          text: "忍受焦灼剧痛，空无一物地向大理石中心走廊狂奔",
          nextNodeId: "hallway_center"
        }
      ]
    },
    {
      id: "hallway_center",
      text: "你矗立在大厅尽头的大理石前。眼前平躺着一架巍峨厚重的黄金镶嵌守护符印的城堡正门。符印封杀了一切外逃企图，正前有一个细缝锁孔。如果放弃从正门逃跑，一旁阴森向下曲曲折折的泥泞石阶，将通往深不可测的地穴深渊...",
      imagePrompt: "A giant epic golden portal gate labeled with glowing seal rune circles inside castle, dark gothic illustration",
      choices: [
        {
          text: "举起你搜刮的‘黄铜古匙’，精准插入闪烁的锁孔中解锁大门",
          nextNodeId: "golden_door_win",
          condition: { name: "has_key", comparator: "eq", value: "true" }
        },
        {
          text: "没有钥匙！强行用蛮力撞破符咒封印的大锁",
          nextNodeId: "smash_door_fail",
          condition: { name: "has_key", comparator: "eq", value: "false" }
        },
        {
          text: "害怕无用尝试！径直从一边的泥石阶下到古堡深渊地牢",
          nextNodeId: "abyss_dungeon"
        }
      ]
    },
    {
      id: "smash_door_fail",
      text: "你用身体猛力冲撞！门不仅无感，上面的防御咒圈更瞬间激发雷法反震！狂暴的电流在瞬间狂殴你的双躯，电光之中，你大口狂喷鲜血，几乎奄奄一息...",
      imagePrompt: "A violent magic blast of electric sparks firing back from a heavy locked portal, intense light effects",
      choices: [
        {
          text: "气喘吁吁。在断气前挣扎着，滚入一边的阶梯去往地穴逃生",
          nextNodeId: "abyss_dungeon"
        }
      ]
    },
    {
      id: "abyss_dungeon",
      text: "地穴走廊里湿漉斑斑。你刚走过两个牢房，一个兜帽之下全是鬼火的残烛黑商，正浮空在大雾之中讪笑。他能用秘传巫术一键复原你的肉体伤痛，代价是剥夺抽取你的理智度（Sanity）...",
      imagePrompt: "A ghost skeleton shopkeeper floating in deep mist holding potions, fantasy art style illustration",
      choices: [
        {
          text: "将灵魂出卖！吸食灰色的魔法汤汁（HP重新拉满）",
          nextNodeId: "alchemy_heal_insane",
          variableEffect: { name: "health", operation: "set", value: "100" }
        },
        {
          text: "感觉是个害人幽魂，退开，冲往泥路地表更深黑处",
          nextNodeId: "dead_end_fall"
        }
      ]
    },
    {
      id: "alchemy_heal_insane",
      text: "大口饮下邪恶巫汤！浑身的伤口瞬间融化痊愈，你感到气吞山河！但你的眼睛变得猩红，耳边的古神呓语开始连番大作。你的神经在瞬间崩溃了，化身成为了古堡在幽冥里永久游荡的僵死傀儡...",
      imagePrompt: "A pale corrupted human with fully pitch-black empty eyes showing red curse veins on temple, fantasy horror",
      choices: [
        {
          text: "成为疯狂的一部分 (游玩失败)",
          nextNodeId: "death_insanity"
        }
      ]
    },
    {
      id: "dead_end_fall",
      text: "因为地势险恶且没有丝毫灯光，在惊慌失措之中，你一脚踏空！前方的地面早已彻底坍塌，脚下是滚滚而上的恶鬼毒烟与无穷无尽的陡峭岩石...你坠入万劫不复之境。",
      imagePrompt: "An adventurer sliding deep down a bottomless jagged dark stone mine crater pit, dramatic concept",
      choices: [
        {
          text: "在不停坠落中失去意识 (游玩失败)",
          nextNodeId: "death_falling_pit"
        }
      ]
    },
    {
      id: "golden_door_win",
      text: "精钢古铜匙完美的契合了锁孔大锁！在黄铜钥匙滑动的瞬间，蔓天璀璨耀眼的星阵咒法应声瓦解，沉闷的大门咔嚓推开。眼前飞洒进扑面温熏的青松花泥雨后晨曦。不远处天际泛着鱼肚白光，朝阳生机冉冉——你彻底逃出生天！",
      imagePrompt: "A glorious shining stone passage opening up into an epic lush forest with rising red dawn sunrise, painting of victory",
      choices: [] // Victory Ending
    },
    {
      id: "death_insanity",
      text: "肉身虽完整，魂魄早已空。你日夜拿着砍刀和盾牌游走在暗无天日的古堡，等待着下一个迷航旅人的血光气息...",
      imagePrompt: "A spooky ghost hollow roaming stone catacombs, eerie concept rendering",
      choices: []
    },
    {
      id: "death_falling_pit",
      text: "在沉重的冲击声中，落石砸烂了最后一丝反抗。古堡的地层里，又多了一位不自量力的愚蠢旅人的累累骸骨...",
      imagePrompt: "A broken torch with fading warm embers on stone floors among dust, grim illustration",
      choices: []
    }
  ]
};
