<template>
  <component
    :is="asChild ? 'span' : 'button'"
    class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    :class="variantClass + ' ' + sizeClass + (customClass ? ' ' + customClass : '')"
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
  asChild?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  asChild: false,
  class: '',
})

const customClass = computed(() => props.class)

const variantClass = computed(() => {
  switch (props.variant) {
    case 'destructive':
      return 'bg-destructive text-white hover:bg-destructive/90'
    case 'outline':
      return 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground'
    case 'secondary':
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    case 'ghost':
      return 'hover:bg-accent hover:text-accent-foreground'
    case 'link':
      return 'text-primary underline-offset-4 hover:underline'
    default:
      return 'bg-primary text-primary-foreground hover:bg-primary/90'
  }
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-8 rounded-md gap-1.5 px-3'
    case 'lg':
      return 'h-10 rounded-md px-6'
    case 'icon':
      return 'size-9'
    case 'icon-sm':
      return 'size-8'
    case 'icon-lg':
      return 'size-10'
    default:
      return 'h-9 px-4 py-2'
  }
})
</script>
