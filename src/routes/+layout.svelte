<script>
	import '../app.css';

	let currentTheme = $state('cottage'); //reactive declaration with $

	function toggleTheme() {
		currentTheme = currentTheme === 'cottage' ? 'hacker' : 'cottage';
	}

	$effect(() => {
		if (typeof document != 'undefined') {
			document.documentElement.setAttribute('data-theme', currentTheme)
		}
	});

	// Snippets/Slots let your pages inherit functions from the layout
	let { children } = $props();
</script>

<header class="p-4 flex justify-end">
	<button 
		onclick={toggleTheme} 
		class="px-4 py-2 border-2 border-current rounded font-bold cursor-pointer transition-transform active:scale-95"
	>
		Toggle System Mode
	</button>
</header>

{@render children()}