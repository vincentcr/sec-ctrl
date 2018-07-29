<template>
<div>
    <h3>{{site.name}}</h3>
    <h4>Partitions</h4>
    <ul>
      <li v-for="partition of activePartitions()" v-bind:key="partition.partitionId">
        <p>{{partition}}</p>

        <ul>
          <li v-for="zone of zonesInPartition(partition.partitionId)" v-bind:key="zone.zoneId">
            {{zone}}
          </li>
        </ul>

      </li>
    </ul>
    <h4>Zones</h4>
    <ul>
      <li v-for="zone of site.zones" v-bind:key="zone.zoneId">
        {{zone}}
      </li>
    </ul>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import { Site } from "../store";

export default Vue.component("dashboard", {
  props: ["site"],
  methods: {
    activePartitions() {
      const site: Site = this.site;
      return Object.entries(site.partitions)
        .filter(([id, part]) => part.status !== "Busy")
        .reduce(
          (partitions, [id, part]) => {
            partitions[id] = part;
            return partitions;
          },
          {} as any
        );
    },

    zonesInPartition(partitionId: number) {
      const site: Site = this.site;
      return Object.entries(site.zones)
        .filter(([id, zone]) => zone.partitionId === partitionId)
        .reduce(
          (zones, [id, zone]) => {
            zones[id] = zone;
            return zones;
          },
          {} as any
        );
    }
  }
});
</script>
