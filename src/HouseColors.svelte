<script>
	import Tile from "./Tile.svelte";
	import * as data from "./sw-schemes.json";

	let items = data.default;
	let filterText = "";
	let filters = [];

	function onInput() {
		if (filterText === "") {
			filters = [];
		} else {
			filters = filterText.split(" ");
		}
	}
</script>

<h1>House</h1>
<span>Filter Schemes:</span>
<input bind:value={filterText} on:input={onInput} placeholder="ex: 7 21 23" />

{#each items as item}
	{#if filters.length === 0 || filters.includes(item.name.toString())}
		<h2>Scheme {item.name}</h2>
		<Tile code={item.body} title="Body/Garage Door" />
		<Tile code={item.trim} title="Trim/Pop Outs" />
		<br />
		<br />
		<br />
		<br />
	{/if}
{/each}
