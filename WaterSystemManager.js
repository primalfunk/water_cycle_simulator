class WaterSystemManager {
  constructor(screenWidth) {
    this.screenWidth = screenWidth;
    this.cloudWater = new Map();
    this.landWater = new Map();
    this.waterBodyVolume = new Map();
    this.soakedWater = new Map();
    this.waterEvaporationRate = 0.1;
    this.landEvaporationRate = 0.05;
    this.vaporToLiquidRatio = 300;
    this.landVaporToLiquidRatio = 0.01;
  }

  calculateWaterBodyVolume(terrain) {
    terrain.forEach((block) => {
      if (block.type === "water") {
        let volume = block.width * 100;
        this.waterBodyVolume.set(block, volume);
      }
    });
  }

  handleCondensation(clouds) {
    clouds.forEach((cloud) => {
      let currentWater = this.cloudWater.get(cloud) || 0;
      if (currentWater > 1000) {
        cloud.condensationLevel = Math.min(cloud.condensationLevel + 1, 10);
        this.cloudWater.set(cloud, currentWater - 1000);
      }
    });
  }

  handlePrecipitation(clouds, terrain, deltaTime) {
    clouds.forEach((cloud) => {
      if (cloud.condensationLevel >= 10 && cloud.isRaining) {
        let deltaTimeInSeconds = deltaTime / 60;
        let rainVolumePerSecond = 1000; // Adjust as needed
        let rainVolumeThisFrame = rainVolumePerSecond * deltaTimeInSeconds;
        terrain.forEach((block) => {
          let blockEndX = block.startX + block.width;
          if (cloud.x >= block.startX && cloud.x <= blockEndX) {
            let cloudOverlap = this.calculateCloudOverlap(cloud, block);
            let rainOnBlock = rainVolumeThisFrame * cloudOverlap;
            if (block.type === "land") {
              let currentLandWater = this.landWater.get(block) || 0;
              let newSoakedWater = rainOnBlock * this.landVaporToLiquidRatio; // Adjusted ratio
              this.landWater.set(block, currentLandWater + newSoakedWater);
              let soakedWater = this.soakedWater.get(block) || 0;
              this.soakedWater.set(block, soakedWater + newSoakedWater);
            } else if (block.type === "water") {
              let currentVolume = this.waterBodyVolume.get(block) || 0;
              let replenishedVolume = rainOnBlock / this.vaporToLiquidRatio; // Adjusted ratio
              this.waterBodyVolume.set(
                block,
                currentVolume + replenishedVolume
              );
            }
          }
        });

        if (cloud.alpha <= 0) {
          cloud.condensationLevel = 0;
          this.cloudWater.set(cloud, 0);
        }
      }
    });
  }

  handleEvaporation(terrain, clouds, createCloudCallback) {
    terrain.forEach(block => {
        let vaporVolume;

        // Handle water blocks
        if (block.type === 'water') {
            let volumeDecrease = this.waterEvaporationRate;
            let currentVolume = this.waterBodyVolume.get(block) - volumeDecrease;
            this.waterBodyVolume.set(block, Math.max(currentVolume, 0));
            vaporVolume = volumeDecrease * this.vaporToLiquidRatio;

            // Check for clouds above the water block
            let cloudAbove = clouds.some(cloud => {
                let cloudBounds = cloud.getBounds();
                return (cloudBounds.x < block.startX + block.width) && 
                       (cloudBounds.x + cloudBounds.width > block.startX);
            });

            if (!cloudAbove && block.type === 'water') {
                createCloudCallback(block.startX + block.width / 2);
            } else {
                this.distributeVaporToClouds(block, clouds, vaporVolume);
            }
        }

        // Handle land blocks
        else if (block.type === 'land') {
            let soakedWaterAmount = this.soakedWater.get(block) || 0;
            if (soakedWaterAmount > 0) {
                let evaporationAmount = Math.min(soakedWaterAmount, this.landEvaporationRate);
                let newSoakedWaterAmount = Math.max(soakedWaterAmount - evaporationAmount, 0);
                this.soakedWater.set(block, newSoakedWaterAmount);
                vaporVolume = evaporationAmount * this.landVaporToLiquidRatio;
                this.distributeVaporToClouds(block, clouds, vaporVolume);
            }
        }
    });
}

  distributeVaporToClouds(block, clouds, vaporVolume, createCloudCallback) {
    let overlappingClouds = clouds.filter((cloud) => {
      let cloudBounds = cloud.getBounds();
      return (
        cloudBounds.x + cloudBounds.width > block.startX &&
        cloudBounds.x < block.startX + block.width &&
        !cloud.isRaining
      );
    });
    if (overlappingClouds.length > 0) {
      let vaporPerCloud = vaporVolume / overlappingClouds.length;
      overlappingClouds.forEach((cloud) => {
        let currentWater = this.cloudWater.get(cloud) || 0;
        let maxWaterCapacity = 10000; // Example max capacity
        let newWaterAmount = Math.min(
          currentWater + vaporPerCloud,
          maxWaterCapacity
        );
        this.cloudWater.set(cloud, newWaterAmount);
      });
    } else {
      // Overflow handling
      let currentLandWater = this.landWater.get(block) || 0;
      this.landWater.set(block, currentLandWater + vaporVolume);
    }
  }

  calculateCloudOverlap(cloud, block) {
    let cloudBounds = cloud.getBounds();
    let overlapStart = Math.max(cloudBounds.x, block.startX);
    let overlapEnd = Math.min(
      cloudBounds.x + cloudBounds.width,
      block.startX + block.width
    );
    let overlapWidth = Math.max(0, overlapEnd - overlapStart);
    return overlapWidth / cloudBounds.width;
  }

  calculateOverlapDuration(
    cloud,
    block,
    cloudTravelDistance,
    deltaTimeInSeconds
  ) {
    // Cloud's initial and final positions in this frame
    let cloudStartX = cloud.x;
    let cloudEndX = cloudStartX + cloudTravelDistance;
    let cloudWidth = cloud.width; // Assuming cloud.width is defined

    // Terrain block's position
    let blockStartX = block.startX;
    let blockEndX = blockStartX + block.width;

    // Calculate the time when the cloud starts and ends covering the block
    let timeCloudStartsCovering = 0;
    let timeCloudEndsCovering = deltaTimeInSeconds;

    if (cloudTravelDistance >= 0) {
      // Cloud moving to the right
      if (cloudEndX < blockStartX || cloudStartX > blockEndX) {
        // No overlap if cloud is completely past the block or before it
        return 0;
      }
      // When does the cloud start covering the block?
      if (cloudStartX < blockStartX) {
        let distanceToBlockStart = blockStartX - cloudStartX;
        timeCloudStartsCovering = Math.max(
          0,
          distanceToBlockStart / cloudTravelDistance
        );
      }
      // When does the cloud stop covering the block?
      if (cloudEndX > blockEndX) {
        let distanceToBlockEnd = blockEndX - cloudStartX;
        timeCloudEndsCovering = Math.min(
          deltaTimeInSeconds,
          distanceToBlockEnd / cloudTravelDistance
        );
      }
    } else {
      if (cloudStartX < blockStartX || cloudEndX > blockEndX) {
        return 0;
      }
      if (cloudEndX > blockEndX) {
        let distanceToBlockEnd = blockEndX - cloudEndX;
        timeCloudStartsCovering = Math.max(
          0,
          -distanceToBlockEnd / cloudTravelDistance
        );
      }
      if (cloudStartX < blockStartX) {
        let distanceToBlockStart = blockStartX - cloudEndX;
        timeCloudEndsCovering = Math.min(
          deltaTimeInSeconds,
          -distanceToBlockStart / cloudTravelDistance
        );
      }
    }
    let overlapDuration = timeCloudEndsCovering - timeCloudStartsCovering;
    return overlapDuration / deltaTimeInSeconds; // Normalize to a fraction of the total frame time
  }
}

export default WaterSystemManager;
