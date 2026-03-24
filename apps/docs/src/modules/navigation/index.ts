/**
 * Navigation module — public interface.
 */

// Domain: navigation context
export {
  type BreadcrumbItem,
  type TocEntry,
  buildNavigationApiPath,
  findNavigationItem,
  buildBreadcrumbs,
} from "./domain/navigation-context";

// Application: navigation query hook
export {
  useNavigation,
  navigationQueryKey,
  type NavigationViewState,
} from "./application/use-navigation";

// Infrastructure: navigation API client
export {
  fetchNavigation,
  type NavigationFetchResult,
} from "./infrastructure/navigation-api";

// Presentation: navigation components
export { Sidebar } from "./presentation/sidebar";
export { SidebarLoading } from "./presentation/sidebar-loading";
export { Breadcrumbs } from "./presentation/breadcrumbs";
export { TableOfContents } from "./presentation/table-of-contents";
export { NavigationError } from "./presentation/navigation-error";
export { ReadingShell } from "./presentation/reading-shell";

// Presentation: sidebar context
export {
  SidebarProvider,
  useSidebarSlot,
  useSetSidebar,
} from "./presentation/sidebar-context";

// Presentation: header controls context
export {
  HeaderControlsProvider,
  useHeaderControlsSlot,
  useSetHeaderControls,
} from "./presentation/header-controls-context";
