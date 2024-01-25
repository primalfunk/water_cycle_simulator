import GraphicsManager from './Graphics.js';
import WaterSystemManager from './WaterSystemManager.js';

let app = new PIXI.Application({ 
    width: 800,
    height: 600,
    backgroundColor: 0x1099bb
});
document.getElementById('display').appendChild(app.view);
let screenWidth = app.screen.width;
let wsm = new WaterSystemManager(screenWidth);
let gm = new GraphicsManager(app, wsm);

gm.generateRandomTerrain();
gm.createCloudsAboveWaterBodies();
let ep = gm.createEvaporationEffect();
ep.forEach(particle => app.stage.addChild(particle));

app.ticker.add((deltaTime) => {
    gm.updateSimulation(deltaTime);

    // Update cloud labels
    gm.clouds.forEach(cloud => {
        if (cloud.cloudLabel) {
            let currentWater = wsm.cloudWater.get(cloud) || 0;
            let condensationLevelWater = (cloud.condensationLevel || 0) * 1000;
            let totalWaterContent = currentWater + condensationLevelWater;
            cloud.cloudLabel.text = `Vapor: ${Math.round(totalWaterContent)}`;
        }
    });

    // Update water body labels
    gm.terrain.forEach(block => {
        if (block.type === 'water' && block.label) {
            let volume = Math.round(wsm.waterBodyVolume.get(block) || 0);
            block.label.text = `Water: ${volume}`;
        }
    });

    // Update soaked water labels
    gm.terrain.forEach(block => {
        if (block.type === 'land' && block.soakedWaterLabel) {
            let soakedWater = wsm.soakedWater.get(block) || 0;
            block.soakedWaterLabel.text = `Soaked: ${Math.round(soakedWater)}`;
        }
    });

    gm.sortClouds();

    gm.clouds.forEach(cloud => {
        gm.animateCloud(cloud);
        gm.updateCondensation(cloud, deltaTime);
        if (cloud.raindrops) {
            cloud.raindrops = gm.animateRaindrops(cloud.raindrops, cloud);
        }
    });

    gm.animateEvaporation(ep);
});