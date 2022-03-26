<script>
	export let code;
	export let title = "";

	import * as colors from "./sw-colors.json";

	let colorInfo = colors.default.find((c) => c.code === `SW${code}`);
	let textColor =
		parseInt(colorInfo.hex, 16) > 0xffffff / 2 ? "#000" : "#fff";
</script>

{#if colorInfo}
	<p>{title}</p>
	<div class="tile" style="background:#{colorInfo.hex};color:{textColor}">
		<div class="tile-code">{colorInfo.code}</div>
		<div class="tile-name">{colorInfo.name}</div>
	</div>
{/if}

<style>
	.tile {
		height: 160px;
		width: 160px;
		padding: 0.4em;
		margin: 0.4em;
	}

	.tile-name {
		font-size: 1.4em;
		font-weight: bold;
		max-width: 100%;
		overflow-wrap: break-word;
		-webkit-hyphens: auto;
		-ms-hyphens: auto;
		hyphens: auto;
	}

	.tile-code {
		font-size: 1em;
		margin-bottom: 0.4em;
	}
</style>
