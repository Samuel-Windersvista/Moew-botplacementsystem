// ABPS 优化后验证 V7
const random = { getInt:(a,b)=>Math.floor(Math.random()*(b-a+1))+a, getChance100:(c)=>Math.random()*100<c };

const MAPS = {
    bigmap:"海关", factory4_day:"工厂白天", factory4_night:"工厂夜晚", interchange:"立交桥",
    laboratory:"实验室", lighthouse:"灯塔", rezervbase:"储备站", sandbox:"GZ低", sandbox_high:"GZ高",
    shoreline:"海岸线", tarkovstreets:"街区", woods:"森林"
};

// === 新配置 ===
const LIMIT = { bigmap:23, factory4_day:15, factory4_night:15, interchange:23, laboratory:19,
    lighthouse:22, rezervbase:22, sandbox:18, sandbox_high:18, shoreline:22, tarkovstreets:23, woods:24 };
const SOFT = 3;
const ESC = 360;

const PMC_LIM = { bigmap:{min:7,max:7}, factory4_day:{min:6,max:6}, factory4_night:{min:6,max:6},
    interchange:{min:6,max:7}, laboratory:{min:6,max:6}, lighthouse:{min:7,max:7},
    rezervbase:{min:6,max:7}, sandbox:{min:6,max:6}, sandbox_high:{min:6,max:7},
    shoreline:{min:6,max:7}, tarkovstreets:{min:7,max:8}, woods:{min:8,max:9} };
const SCAV = { bigmap:5, factory4_day:2, factory4_night:3, interchange:6, laboratory:0,
    lighthouse:6, rezervbase:6, sandbox:3, sandbox_high:4, shoreline:6, tarkovstreets:4, woods:5 };
const WAVE = { delay:299, between:385, stop:302, maxPer:2 };

const BOSS = {
    bigmap:        [{n:"Knight",c:22,s:5},{n:"Reshala",c:22,s:5},{n:"Partisan",c:15,s:1},{n:"祭司",c:15,s:3}],
    factory4_day:  [{n:"Tagilla",c:35,s:1},{n:"祭司",c:20,s:3}],
    factory4_night:[{n:"Tagilla",c:35,s:1}],
    interchange:   [{n:"Killa",c:40,s:1}],
    laboratory:    [{n:"Raider",c:85,s:4}],
    lighthouse:    [{n:"Knight",c:22,s:5},{n:"Partisan",c:25,s:1}],
    rezervbase:    [{n:"Glukhar",c:38,s:7}],
    sandbox:       [{n:"Kolontay",c:32,s:8}],
    sandbox_high:  [{n:"Kolontay",c:20,s:8},{n:"祭司",c:25,s:3}],
    shoreline:     [{n:"Knight",c:22,s:5},{n:"Sanitar",c:22,s:4},{n:"祭司",c:10,s:3}],
    tarkovstreets: [{n:"Kolontay",c:18,s:8},{n:"Kaban",c:18,s:9}],
    woods:         [{n:"Knight",c:22,s:5},{n:"Partisan",c:15,s:1},{n:"Shturman",c:22,s:3},{n:"祭司",c:15,s:3}],
};
// 旧配置 (对比用)
const OLD_BOSS = {
    bigmap:        [{c:28,s:5},{c:28,s:5},{c:25,s:1},{c:15,s:3}],
    factory4_day:  [{c:28,s:1},{c:20,s:3}],
    factory4_night:[{c:28,s:1}],
    interchange:   [{c:28,s:1}],
    laboratory:    [{c:85,s:4}],
    lighthouse:    [{c:28,s:5},{c:25,s:1}],
    rezervbase:    [{c:28,s:7}],
    sandbox:       [{c:25,s:8}],
    sandbox_high:  [{c:25,s:8},{c:25,s:3}],
    shoreline:     [{c:28,s:5},{c:25,s:1},{c:28,s:4},{c:10,s:3}],
    tarkovstreets: [{c:25,s:8},{c:28,s:9}],
    woods:         [{c:28,s:5},{c:25,s:1},{c:28,s:3},{c:15,s:3}],
};

const RAIDS = 20;
const ALL_MAPS = Object.keys(LIMIT);

// --- 旧配置 Boss极差 ---
function bossExtremes(bosses) {
    let sim=10000, minB=Infinity, maxB=0, sum=0, zeroC=0;
    for(let i=0;i<sim;i++){
        let s=0, any=false;
        for(const b of bosses){if(b.c>0&&random.getChance100(b.c)){s+=b.s;any=true}}
        sum+=s; minB=Math.min(minB,s); maxB=Math.max(maxB,s); if(!any)zeroC++;
    }
    return {avg:sum/sim, min:minB, max:maxB, zero:zeroC/sim*100};
}

// --- 运行 ---
console.log("=== 优化后 360分钟全图验证 (上限+2: 工厂15 GZ18 森林24) ===\n");
console.log("图名      |上限|起始PMC|起始Scav|SN|起始合计|空位|波次|PMC合计|Boss期望|Boss率|体感|Delta|原极差→新");
console.log("-".repeat(92));

for (const m of ALL_MAPS) {
    const lim = LIMIT[m];
    const pmcMin = PMC_LIM[m].min, pmcMax = PMC_LIM[m].max;
    const scv = SCAV[m];
    const hasSN = !m.includes("factory") && m !== "laboratory";
    
    let tStartPMC = 0, tStartSN = 0, tWavePMC = 0, tBoss = 0, bossR = 0;
    for (let r = 0; r < RAIDS; r++) {
        const startPMC = random.getInt(pmcMin, pmcMax);
        const sn = hasSN ? random.getInt(1, 2) : 0;
        let boss = 0;
        for (const b of (BOSS[m]||[])) {
            if (b.c > 0 && random.getChance100(b.c)) boss += b.s;
        }
        if (boss > 0) bossR++;
        const initO = startPMC + scv + sn;
        const maxSl = Math.max(0, lim - initO - SOFT);
        let actualWave = 0, rmd = maxSl;
        for (let w = 0; w < 54 && rmd > 0; w++) {
            const one = Math.min(random.getInt(1, WAVE.maxPer), rmd);
            actualWave += one; rmd -= one;
        }
        tStartPMC += startPMC;
        tStartSN += sn;
        tWavePMC += actualWave;
        tBoss += boss;
    }
    
    const avgStartTotal = tStartPMC/RAIDS + scv + tStartSN/RAIDS;
    const avgWave = tWavePMC / RAIDS;
    const avgPMC = tStartPMC/RAIDS + avgWave;
    const avgBoss = tBoss / RAIDS;
    const avgTotal = avgPMC + scv + tStartSN/RAIDS + avgBoss;
    
    const newExt = bossExtremes(BOSS[m]||[]);
    const oldExt = bossExtremes(OLD_BOSS[m]||[]);
    const bossDelta = (avgBoss - (OLD_BOSS[m]||[]).reduce((s,b)=>s+b.s*b.c/100,0)).toFixed(1);
    
    console.log(
        `${MAPS[m].padEnd(9)}|${String(lim).padStart(2)}→${String(lim)}|` +
        `${String(pmcMin)}-${String(pmcMax).padEnd(2)}| ${String(scv+"").padStart(2)}    |` +
        `${hasSN?"+SN":"   "}|` +
        `${avgStartTotal.toFixed(1).padStart(5)} |` +
        `${Math.max(0,lim-avgStartTotal-SOFT).toFixed(0).padStart(3)}|` +
        `${avgWave.toFixed(1).padStart(4)}|` +
        `${avgPMC.toFixed(1).padStart(5)}|` +
        `${avgBoss.toFixed(1).padStart(5)} |` +
        `${(bossR/RAIDS*100).toFixed(0).padStart(3)}%|` +
        `${avgTotal.toFixed(1).padStart(4)}|` +
        `${bossDelta.padStart(4)}|` +
        `${oldExt.max}→${newExt.max}`
    );
}

// 优化前后对比
console.log("\n=== 优化前后对比 ===\n");
console.log("地图       |原上限|新上限|原空位|新空位|原波次|新波次|原Boss率|新Boss率|原极差|新极差");
console.log("-".repeat(80));
for (const m of ALL_MAPS) {
    const oldLim = { bigmap:23, factory4_day:13, factory4_night:13, interchange:23, laboratory:19,
        lighthouse:22, rezervbase:22, sandbox:16, sandbox_high:16, shoreline:22, tarkovstreets:23, woods:22 }[m];
    const oldScv = { bigmap:5, factory4_day:4, factory4_night:5, interchange:6, laboratory:0,
        lighthouse:6, rezervbase:6, sandbox:5, sandbox_high:6, shoreline:6, tarkovstreets:4, woods:7 }[m];
    const oldPMCmin = { bigmap:7, factory4_day:6, tarkovstreets:6, rezervbase:5, sandbox:6, woods:8 }[m]||PMC_LIM[m].min;
    const hasSN = !m.includes("factory") && m !== "laboratory";
    const oldStart = oldPMCmin + oldScv + (hasSN?1.5:0);
    const oldSlots = Math.max(0, oldLim - oldStart - 3);
    const newStart = PMC_LIM[m].min + SCAV[m] + (hasSN?1.5:0);
    const newSlots = Math.max(0, LIMIT[m] - newStart - 3);
    
    // Boss - simulate quick for rates
    let oldB=0, newB=0;
    for(let i=0;i<2000;i++){
        let os=0, ns=0;
        for(const b of (OLD_BOSS[m]||[])){if(b.c>0&&random.getChance100(b.c))os+=b.s}
        for(const b of (BOSS[m]||[])){if(b.c>0&&random.getChance100(b.c))ns+=b.s}
        oldB+=os; newB+=ns;
    }
    
    const oldExt = bossExtremes(OLD_BOSS[m]||[]);
    const newExt = bossExtremes(BOSS[m]||[]);
    
    console.log(
        `${MAPS[m].padEnd(10)}|${String(oldLim).padStart(4)} |${String(LIMIT[m]).padStart(4)} |` +
        `${oldSlots.toFixed(0).padStart(4)} |${newSlots.toFixed(0).padStart(4)} |` +
        `${(oldSlots>0?Math.min(oldSlots,54):0).toFixed(0).padStart(4)}|${Math.min(newSlots,54).toFixed(0).padStart(4)}|` +
        `${(oldB/2000).toFixed(1).padStart(5)} |${(newB/2000).toFixed(1).padStart(5)} |` +
        ` ${oldExt.max.toString().padStart(2)}→${newExt.max.toString().padStart(2)}`
    );
}
