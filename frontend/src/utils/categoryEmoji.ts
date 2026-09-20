export function getCategoryEmoji(name: string, category: string | null | undefined): string {
  const n = name.toLowerCase();
  
  // Keyword matching first
  if (n.includes('bulb') || n.includes('light')) return '💡';
  if (n.includes('lock')) return '🔒';
  if (n.includes('plug') || n.includes('outlet') || n.includes('adapter') || n.includes('charger') || n.includes('docking') || n.includes('hub')) return '🔌';
  if (n.includes('camera')) return '📷';
  if (n.includes('speaker') || n.includes('soundbar')) return '🔊';
  if (n.includes('thermostat')) return '🌡️';
  if (n.includes('sensor')) return '📡';
  if (n.includes('watch') || n.includes('band') || n.includes('ring')) return '⌚';
  if (n.includes('headphone') || n.includes('earbud')) return '🎧';
  if (n.includes('keyboard')) return '⌨️';
  if (n.includes('mouse') || n.includes('trackpad')) return '🖱️';
  if (n.includes('monitor') || n.includes('display') || n.includes('ultrawide')) return '🖥️';
  if (n.includes('laptop') || n.includes('notebook') || n.includes('ultrabook') || n.includes('cloudbook')) return '💻';
  if (n.includes('tablet')) return '📱';
  if (n.includes('backpack') || n.includes('bag') || n.includes('pouch') || n.includes('messenger')) return '🎒';
  if (n.includes('shoe') || n.includes('boot') || n.includes('sandal') || n.includes('runner')) return '👟';
  if (n.includes('toaster') || n.includes('fryer') || n.includes('blender') || n.includes('sous-vide')) return '🍳';
  if (n.includes('doorbell')) return '🔔';
  if (n.includes('turntable')) return '💿';
  if (n.includes('microphone')) return '🎤';
  if (n.includes('glasses')) return '👓';
  if (n.includes('controller')) return '🎮';

  // Fallback to broad category
  if (!category) return '📦';
  switch (category.trim()) {
    case 'Wearables': return '⌚';
    case 'Monitors': return '🖥️';
    case 'Laptops': return '💻';
    case 'Footwear': return '👟';
    case 'Bags': return '🎒';
    case 'Audio': return '🎧';
    case 'Power': return '🔋';
    case 'Smart Home': return '🏠';
    case 'Peripherals': return '⌨️';
    default: return '📦';
  }
}
