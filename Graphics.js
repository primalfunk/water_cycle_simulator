class GraphicsManager {
    constructor(app, waterSystemManager) {
        this.app = app;
        this.clouds = [];
        this.terrain = []; 
        this.terrainLabels = [];
        this.soakedWaterLabels = [];
        this.evaporationParticles = [];
        this.wsm = waterSystemManager;
    }

    createTerrain(type, startX, width) {
        let terrainColor = type === 'land' ? 0x661800 : 0x0000ff;
        let terrain = new PIXI.Graphics();
        terrain.beginFill(terrainColor);
        terrain.drawRect(startX, this.app.screen.height - 100, width, 100);
        terrain.endFill();
        let terrainBlock = { type: type, startX: startX, width: width, label: null };
        if (type === 'water') {
            let waterLabel = new PIXI.Text('Volume: 0', { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff });
            waterLabel.x = startX + width / 2;
            waterLabel.y = this.app.screen.height - 120;
            terrainBlock.label = waterLabel; // Assign label to terrain block
            this.app.stage.addChild(waterLabel);
        } else if (type === 'land') {
            let soakedWaterLabel = new PIXI.Text('Soaked: 0', { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff });
            soakedWaterLabel.x = startX + width / 2;
            soakedWaterLabel.y = this.app.screen.height - 120; // Position above water label
            terrainBlock.soakedWaterLabel = soakedWaterLabel; // Assign soaked water label to terrain block
            this.app.stage.addChild(soakedWaterLabel);
        }
        this.terrain.push(terrainBlock); // Add the terrain block with labels to the array
        return terrain;
    }

    generateRandomTerrain() {
        this.terrain = [];
        let totalLength = this.app.screen.width;
        let halfLength = totalLength / 2;
        let landLengths = this.generateRandomChunkLengths(halfLength, 2);
        let waterLengths = this.generateRandomChunkLengths(halfLength, 2);
        let chunks = [...landLengths.map(len => ({ type: 'land', length: len })),
                      ...waterLengths.map(len => ({ type: 'water', length: len }))];
        this.shuffleArray(chunks);
    
        let currentX = 0;
        for (let i = 0; i < chunks.length; i++) {
            let currentChunk = chunks[i];
            let nextChunk = chunks[i + 1];
            while (nextChunk && currentChunk.type === nextChunk.type) {
                currentChunk.length += nextChunk.length;
                i++;
                nextChunk = chunks[i + 1];
            }
            let terrainBlock = this.createTerrain(currentChunk.type, currentX, currentChunk.length);
            this.app.stage.addChild(terrainBlock);
            currentX += currentChunk.length;
        }
        this.wsm.calculateWaterBodyVolume(this.terrain);
    }

    generateRandomChunkLengths(totalLength, maxChunks) {
        let lengths = [];
        let minChunkLength = totalLength / maxChunks;
        let remainingLength = totalLength - (minChunkLength * maxChunks);
        for (let i = 0; i < maxChunks; i++) {
            lengths.push(minChunkLength);
        }
        for (let i = 0; i < remainingLength; i++) {
            lengths[Math.floor(Math.random() * maxChunks)] += 1;
        }
        return lengths.filter(len => len > 0);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    createCloud(xPosition) {
        let cloud = new PIXI.Graphics();
        let cloudLabel = new PIXI.Text('Water: 0', { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff });
        cloud.cloudLabel = cloudLabel;
        cloud.id = Math.random().toString(36).substr(2, 9);
        cloud.beginFill(0xf0f0ff);
        cloud.drawEllipse(0, 0, 60, 40);
        cloud.endFill();
        cloud.x = xPosition;
        cloud.y = 50 + Math.random() * 120;
        cloudLabel.x = cloud.x;
        cloudLabel.y = cloud.y - 20;
        let initialScale = 0.8 + Math.random() * 0.4;
        cloud.scale.set(initialScale);
        cloud.condensationLevel = 0;
        cloud.speed = (Math.random() * 2 - 1);
        cloud.isRaining = false;
        this.app.stage.addChild(cloud);
        this.app.stage.addChild(cloudLabel);
        this.clouds.push(cloud);
        
        return cloud;
    }

    createCloudsAboveWaterBodies() {
        this.terrain.forEach(block => {
            if (block.type === 'water') {
                this.createCloud(block.startX + block.width / 2);
            }
        });
    }
    
    createCloudAtPosition(xPosition) {
        this.createCloud(xPosition);
    }

    sortClouds() {
        this.clouds.sort((a, b) => a.scale.x - b.scale.x);
        this.clouds.forEach(cloud => {
            this.app.stage.addChild(cloud);
            if (cloud.cloudLabel) {
                this.app.stage.addChild(cloud.cloudLabel);
            }
        });
    }

    createEvaporationEffect() {
        this.evaporationParticles = [];
        this.terrain.forEach(block => {
            let isWaterBlock = block.type === 'water';
            let numberOfParticles = isWaterBlock ? 10 : 5; // Half the number for land
            let spacing = block.width / numberOfParticles;
    
            for (let i = 0; i < numberOfParticles; i++) {
                let particle = new PIXI.Graphics();
                particle.beginFill(0xadd8e6);
                particle.drawCircle(0, 0, 2);
                particle.endFill();
    
                particle.x = block.startX + i * spacing + spacing / 2;
                particle.y = this.app.screen.height - 100;
                particle.isWater = isWaterBlock;
                particle.block = block;
                particle.visible = false; // Initially hide particles
    
                this.evaporationParticles.push(particle);
                this.app.stage.addChild(particle);
            }
        });
        return this.evaporationParticles;
    }

    animateEvaporation(particles, deltaTime) {
        const landEvaporationRate = 0.3;
        const waterEvaporationRate = 0.8; // Assuming this is the rate you want
        particles.forEach(particle => {
            let waterAmount = particle.isWater ? this.wsm.waterBodyVolume.get(particle.block) : this.wsm.soakedWater.get(particle.block);
            if (waterAmount > 0) {
                let evaporationRate = particle.isWater ? waterEvaporationRate : landEvaporationRate;
                if (Math.random() < evaporationRate) {
                    particle.y -= 0.3 + Math.random() * 1;
                    particle.alpha -= 0.01;
    
                    if (particle.alpha <= 0) {
                        particle.y = this.app.screen.height - 100;
                        particle.alpha = 1;
                    }
                }
                particle.visible = true; // Ensure particles are visible if there's water
            } else {
                particle.visible = false; // Hide particles if there's no water
            }
            if (!particle.isWater && waterAmount > 0) {
                console.log(`Land Block Evaporation Animation: Block StartX - ${particle.block.startX}, Water Amount - ${waterAmount}`);
            }
        });
    }

    updateCondensation(cloud, deltaTime) {
        const MAX_WATER_LEVEL_PER_CONDENSATION = 1000;
        const MAX_CONDENSATION_LEVEL = 10;
        let waterContent = this.wsm.cloudWater.get(cloud) || 0;
        let maxTotalWaterLevel = MAX_CONDENSATION_LEVEL * MAX_WATER_LEVEL_PER_CONDENSATION;
        let totalWaterLevel = (cloud.condensationLevel || 0) * MAX_WATER_LEVEL_PER_CONDENSATION + waterContent;
        let scaleFactor = totalWaterLevel / maxTotalWaterLevel;
        if (!cloud.isRaining) {
            let sizeScale = 0.2 + 2.3 * scaleFactor;
            cloud.scale.set(sizeScale);
            let colorTransition = this.interpolateColor("#F0F0FF", "#949494", scaleFactor);
            cloud.tint = PIXI.utils.rgb2hex(colorTransition);
            if (!cloud.isRaining && totalWaterLevel >= maxTotalWaterLevel) {
                cloud.isRaining = true;
                cloud.initialRainScale = cloud.scale.x;
                if (!cloud.raindrops) {
                    cloud.raindrops = this.createRaindrops(cloud);
                }
                if (cloud.cloudLabel) {
                    this.app.stage.removeChild(cloud.cloudLabel);
                    cloud.cloudLabel = null;
                }
            }
        } else {
            if (!cloud.raindrops) {
                cloud.raindrops = this.createRaindrops(cloud);
            }
            let fadeRate = deltaTime / 10 / 60;
            cloud.alpha -= fadeRate;
            let newScale = Math.max(cloud.initialRainScale - fadeRate, 0);
            cloud.scale.set(newScale, newScale);
            if (cloud.alpha <= 0 || newScale <= 0) {
                cloud.isRaining = false;
                this.removeCloud(cloud);
            }
        }

    }

    interpolateColor(color1, color2, factor) {
        if (factor < 0) factor = 0;
        if (factor > 1) factor = 1;
        let rgb1 = PIXI.utils.hex2rgb(PIXI.utils.string2hex(color1));
        let rgb2 = PIXI.utils.hex2rgb(PIXI.utils.string2hex(color2));
        let result = rgb1.map((c1, i) => {
            return c1 + (rgb2[i] - c1) * factor;
        });
        return PIXI.utils.rgb2hex(result);
    }

    animateCloud(cloud) {
        cloud.x += cloud.speed;
        if (cloud.cloudLabel) {
            cloud.cloudLabel.x += cloud.speed;
        }
        if (cloud.x > this.app.screen.width + 100) {
            cloud.x = -100;
        } else if (cloud.x < -100) {
            cloud.x = this.app.screen.width + 100;
        }
        if (cloud.cloudLabel) {
            cloud.cloudLabel.x = cloud.x;
        }
    }

    removeCloud(cloud) {
        if (cloud.raindrops && cloud.raindrops.length > 0) {
            cloud.raindrops = this.animateRaindrops(cloud.raindrops);
        } else {
            this.app.stage.removeChild(cloud);
            if (cloud.cloudLabel) {
                this.app.stage.removeChild(cloud.cloudLabel);
            }
            const cloudIndex = this.clouds.indexOf(cloud);
            if (cloudIndex > -1) {
                this.clouds.splice(cloudIndex, 1);
            }
        }
    }

    createRaindrops(cloud) {
        let raindrops = [];
        let initialNumberOfRaindrops = 20;
        for (let i = 0; i < initialNumberOfRaindrops; i++) {
            let raindrop = this.createRaindrop(cloud);
            raindrops.push(raindrop);
            this.app.stage.addChild(raindrop);
        }
        return raindrops;
    }
    
    createRaindrop(cloud) {
        let raindrop = new PIXI.Graphics();
        let colors = [0xadd8e6, 0x87CEFA, 0xB0E0E6];
        let randomColor = colors[Math.floor(Math.random() * colors.length)];
        let fallSpeed = 2 + Math.random() * 2.2;
        raindrop.beginFill(randomColor);
        raindrop.drawRect(0, 0, 2, 10);
        raindrop.endFill();
        let cloudBounds = cloud.getBounds();
        raindrop.x = cloudBounds.x + Math.random() * cloudBounds.width;
        raindrop.y = cloudBounds.y + cloudBounds.height;
        raindrop.fallSpeed = fallSpeed;
        return raindrop;
    }

    animateRaindrops(raindrops, cloud) {
        if (cloud && cloud.isRaining && cloud.alpha > 0) {
            if (Math.random() < 0.4) {
                let newRaindrop = this.createRaindrop(cloud);
                raindrops.push(newRaindrop);
                this.app.stage.addChild(newRaindrop);
            }
        }
        let remainingRaindrops = [];
        raindrops.forEach(raindrop => {
            raindrop.y += raindrop.fallSpeed;
            if (raindrop.y <= this.app.screen.height - 100) {
                remainingRaindrops.push(raindrop);
            } else {
                this.app.stage.removeChild(raindrop);
            }
        });
    
        return remainingRaindrops;
    }

    updateLandWaterLabels() {
        this.terrain.forEach(block => {
            if (block.type === 'land' && block.soakedWaterLabel) {
                let soakedWater = this.wsm.soakedWater.get(block) || 0;
                block.soakedWaterLabel.text = `Soaked: ${Math.round(soakedWater)}`;
            }
        });
    }

    updateSimulation(deltaTime) {
        this.wsm.handleEvaporation(this.terrain, this.clouds, (x) => this.createCloudAtPosition(x));
        this.animateEvaporation(this.evaporationParticles, deltaTime);
        this.updateLandWaterLabels(); 
        this.wsm.handleCondensation(this.clouds);
        this.wsm.handlePrecipitation(this.clouds, this.terrain, deltaTime);
    }
}

export default GraphicsManager;