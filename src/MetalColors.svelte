<script>
	import Tile from "./Tile.svelte";
	import * as data from "./sw-metal.json";
</script>

<h1>Metal Rail/Decorative Metal</h1>
{#each data.default as item}
	<Tile code={item} />
{/each}
