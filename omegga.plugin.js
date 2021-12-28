const fs = require("fs").promises;
const brs = require("brs-js");

const ORIGIN = [-1945, -1090, 4377];
const NUM_SEGMENTS = [
    1 + 2 + 8 + 16 + 32 + 64,
    8 + 64,
    1 + 4 + 8 + 16 + 32,
    1 + 4 + 8 + 32 + 64,
    2 + 4 + 8 + 64,
    1 + 2 + 4 + 32 + 64,
    1 + 2 + 4 + 16 + 32 + 64,
    1 + 8 + 64,
    1 + 2 + 4 + 8 + 16 + 32 + 64,
    1 + 2 + 4 + 8 + 32 + 64,
];
const BRICK_OWNERS = [];

for (let i = 0; i < 10; i++) {
    BRICK_OWNERS.push({name: `7seg${i}`, id: `00000000-0000-0000-0000-00000000000${i}`, bricks: 0});
}

module.exports = class CountdownPlugin {
    constructor(omegga, config, store) {
        this.omegga = omegga;
        this.config = config;
        this.store = store;

        this.displayingTime = [-1, -1, -1, -1, -1, -1];
    }

    generateDigit(digit, [offX, offY, offZ], props) {
        const bricks = [];
        const segs = NUM_SEGMENTS[digit];
        for (let i = 0; i < 7; i++) {
            const pow2 = 1 << i;
            if (segs & pow2) {
                for (const brick of this.displaySave.bricks.filter(b => b.color == i)) {
                    const newBrick = {...brick, ...props};
                    newBrick.position = [newBrick.position[0] + offX, newBrick.position[1] + offY, newBrick.position[2] + offZ];
                    bricks.push(newBrick);
                }
            }
        }
        return bricks;
    }

    generateColon([offX, offY, offZ], props) {
        const bricks = [];
        for (const brick of this.colonSave.bricks) {
            const newBrick = {...brick, ...props};
            newBrick.position = [newBrick.position[0] + offX, newBrick.position[1] + offY, newBrick.position[2] + offZ];
            bricks.push(newBrick);
        }
        return bricks;
    }

    async loadBricks(bricks) {
        await this.omegga.loadSaveData({
            bricks,
            brick_assets: this.displaySave.brick_assets,
            brick_owners: BRICK_OWNERS,
            materials: ["BMC_Glow"],
            colors: [[255, 255, 255]]
        }, {quiet: true, offX: ORIGIN[0], offY: ORIGIN[1], offZ: ORIGIN[2]});
    }

    async displayTime(parts) {
        const bricks = [];
        
        // the numbers
        for (let i = 0; i < parts.length; i++) {
            if (this.displayingTime[i] !== parts[i]) {
                this.omegga.clearBricks(BRICK_OWNERS[i].id, {quiet: true});
                bricks.push(...this.generateDigit(parts[i], [0, 90 * i + 40 * Math.floor(i / 2), 0, 0], {owner_index: i + 1, color: 0, material_index: 0}));
                this.displayingTime[i] = parts[i];
            }
        }

        // colons
        bricks.push(...this.generateColon([0, 90 * 2 + 0, 0], {owner_index: 10, color: 0, material_index: 0, asset_name_index: 1}));
        bricks.push(...this.generateColon([0, 90 * 4 + 40, 0], {owner_index: 10, color: 0, material_index: 0, asset_name_index: 1}));

        if (bricks.length > 0) {
            await this.loadBricks(bricks);
        }
    }

    async init() {
        this.displaySave = brs.read(await fs.readFile("plugins/nycountdown/7sd.brs"));
        this.colonSave = brs.read(await fs.readFile("plugins/nycountdown/7sdc.brs"));
        
        // const bricks = [];
        // for (let i = 0; i < 10; i++) {
        //     bricks.push(...this.generateDigit(i, [0, i * 150, 0], {material_index: 0, color: 0}));
        // }

        // await this.loadBricks(bricks);

        setInterval(async () => {
            try {
                const diff = Math.round(Math.abs(this.config["unix-timestamp"] - Date.now() / 1000));

                const hh = Math.floor((diff / 3600) % 24);
                const mm = Math.floor((diff / 60) % 60);
                const ss = diff % 60;
                
                await this.displayTime([
                    Math.floor(hh / 10),
                    hh % 10,
                    Math.floor(mm / 10),
                    mm % 10,
                    Math.floor(ss / 10),
                    ss % 10,
                ]);

                setTimeout(async () => this.omegga.clearBricks(BRICK_OWNERS[9].id, {quiet: true}), 500);
            } catch (e) {
                console.log(`Interval error ${e}`);
            }
        }, 1000);
    }

    async stop() {

    }
}
