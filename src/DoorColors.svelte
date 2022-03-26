<script>
	import Tile from "./Tile.svelte";
	import * as data from "./sw-doors.json";
</script>

<h1>Doors</h1>
{#each data.default as item}
	<Tile code={item} />
{/each}
