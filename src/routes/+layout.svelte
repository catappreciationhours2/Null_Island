<script>
	import '../app.css';
	// import TopBar from '$lib/components/TopBar.svelte'; // 1. Import your component
	import { onMount } from 'svelte';
	import { player, tasks, theme } from '$lib/stores';

	// 2. Boot up the local browser data stream when the website mounts
	onMount(async () => {
		theme.init(); // Apply saved theme
		await player.load(); // Fetch historical save game stats from IndexedDB
		await tasks.load();  // Fetch your saved todo items from IndexedDB
	});

	let { children } = $props();
</script>

<!-- <TopBar /> -->

<main class="w-full">
	{@render children()}
</main>