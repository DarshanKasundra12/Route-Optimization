/**
 * CLUSTERING SERVICE
 * Groups nearby parcel locations to prevent zig-zag routing
 * Uses simple distance-based clustering (k-means-like approach)
 */

class ClusteringService {
  /**
   * Calculate distance between two points using Haversine formula
   * @param {Object} point1 - {latitude, longitude}
   * @param {Object} point2 - {latitude, longitude}
   * @returns {Number} - Distance in kilometers
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) *
        Math.cos(this.toRad(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Cluster parcels based on proximity
   * @param {Array} parcels - Array of {id, latitude, longitude}
   * @param {Number} maxClusterRadius - Maximum radius in km (default 2km)
   * @returns {Array} - Array of clusters, each containing parcel IDs
   */
  clusterParcels(parcels, maxClusterRadius = 2) {
    if (parcels.length === 0) return [];

    const clusters = [];
    const assigned = new Set();

    parcels.forEach((parcel, index) => {
      if (assigned.has(index)) return;

      // Start a new cluster with this parcel
      const cluster = {
        id: clusters.length,
        parcels: [parcel],
        center: {
          latitude: parcel.latitude,
          longitude: parcel.longitude,
        },
      };

      assigned.add(index);

      // Find nearby parcels
      parcels.forEach((otherParcel, otherIndex) => {
        if (assigned.has(otherIndex)) return;

        const distance = this.calculateDistance(cluster.center, {
          latitude: otherParcel.latitude,
          longitude: otherParcel.longitude,
        });

        if (distance <= maxClusterRadius) {
          cluster.parcels.push(otherParcel);
          assigned.add(otherIndex);

          // Update cluster center (centroid)
          this.updateClusterCenter(cluster);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  /**
   * Update cluster center to be the centroid of all parcels in cluster
   * @param {Object} cluster
   */
  updateClusterCenter(cluster) {
    const sumLat = cluster.parcels.reduce((sum, p) => sum + p.latitude, 0);
    const sumLng = cluster.parcels.reduce((sum, p) => sum + p.longitude, 0);

    cluster.center = {
      latitude: sumLat / cluster.parcels.length,
      longitude: sumLng / cluster.parcels.length,
    };
  }

  /**
   * Get cluster representatives (centroids) for route optimization
   * @param {Array} clusters
   * @returns {Array} - Array of cluster centers with parcel IDs
   */
  getClusterRepresentatives(clusters) {
    return clusters.map((cluster) => ({
      clusterId: cluster.id,
      latitude: cluster.center.latitude,
      longitude: cluster.center.longitude,
      parcelIds: cluster.parcels.map((p) => p.id),
      parcelCount: cluster.parcels.length,
    }));
  }

  /**
   * Simple greedy clustering - faster for large datasets
   * @param {Array} parcels
   * @param {Number} maxClusterRadius
   * @returns {Array}
   */
  greedyCluster(parcels, maxClusterRadius = 2) {
    if (parcels.length === 0) return [];

    const clusters = [];
    const remaining = [...parcels];

    while (remaining.length > 0) {
      // Take first remaining parcel as cluster seed
      const seed = remaining.shift();
      const cluster = {
        id: clusters.length,
        parcels: [seed],
        center: {
          latitude: seed.latitude,
          longitude: seed.longitude,
        },
      };

      // Find all parcels within radius
      const toRemove = [];
      remaining.forEach((parcel, index) => {
        const distance = this.calculateDistance(cluster.center, parcel);
        if (distance <= maxClusterRadius) {
          cluster.parcels.push(parcel);
          toRemove.push(index);
        }
      });

      // Remove assigned parcels (in reverse to maintain indices)
      toRemove.reverse().forEach((index) => remaining.splice(index, 1));

      // Update center
      this.updateClusterCenter(cluster);
      clusters.push(cluster);
    }

    return clusters;
  }
}

module.exports = new ClusteringService();
