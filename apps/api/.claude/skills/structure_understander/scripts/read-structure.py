import os
import sys
import re
from pathlib import Path

# --- ENCODING FIX (WINDOWS) ---
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# --- CONFIGURATION ---
IGNORE_SET = {'.git', 'node_modules', '__pycache__', '.next', 'dist', 'build', '.vscode', '.idea', 'data', '.gemini', '.claude', 'coverage'}

# Patterns to detect interfaces and implementations
INTERFACE_PATTERNS = ['.repository.ts', '.provider.ts']
IMPLEMENTATION_DIRS = ['infra/database/repositories', 'infra/auth/providers', 'infra/cryptography/providers']


def is_empty_dir(path):
    """Check if a directory is empty (ignoring folders in ignore_set)"""
    try:
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            if os.path.isfile(item_path):
                return False
            if os.path.isdir(item_path) and item not in IGNORE_SET:
                if not is_empty_dir(item_path):
                    return False
        return True
    except PermissionError:
        return False


def find_bounded_contexts(base_path):
    """Find bounded contexts in domain/"""
    domain_path = os.path.join(base_path, 'src', 'domain')
    contexts = []

    if os.path.exists(domain_path):
        for item in os.listdir(domain_path):
            item_path = os.path.join(domain_path, item)
            if os.path.isdir(item_path) and not item.startswith('.') and item != '@shared':
                contexts.append(item)

    return contexts


def find_http_modules(base_path):
    """Find HTTP modules"""
    http_path = os.path.join(base_path, 'src', 'http')
    modules = []

    if os.path.exists(http_path):
        for item in os.listdir(http_path):
            item_path = os.path.join(http_path, item)
            if os.path.isdir(item_path) and not item.startswith('.') and item != '@shared':
                modules.append(item)

    return modules


def find_interfaces(base_path):
    """Find interfaces (repositories, providers) in domain/"""
    interfaces = []
    domain_path = os.path.join(base_path, 'src', 'domain')

    if not os.path.exists(domain_path):
        return interfaces

    for root, dirs, files in os.walk(domain_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_SET]
        for f in files:
            for pattern in INTERFACE_PATTERNS:
                if f.endswith(pattern):
                    rel_path = os.path.relpath(os.path.join(root, f), base_path)
                    interfaces.append({
                        'name': f,
                        'path': rel_path,
                        'type': pattern.replace('.ts', '').replace('.', '')
                    })

    return interfaces


def find_implementations(base_path):
    """Find implementations in infra/"""
    implementations = []
    infra_path = os.path.join(base_path, 'src', 'infra')

    if not os.path.exists(infra_path):
        return implementations

    for root, dirs, files in os.walk(infra_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_SET]
        for f in files:
            for pattern in INTERFACE_PATTERNS:
                if f.endswith(pattern):
                    rel_path = os.path.relpath(os.path.join(root, f), base_path)
                    implementations.append({
                        'name': f,
                        'path': rel_path,
                        'type': pattern.replace('.ts', '').replace('.', '')
                    })

    return implementations


def match_interface_to_implementation(interfaces, implementations):
    """Map interfaces to their implementations"""
    mappings = []

    for interface in interfaces:
        # Extract base name (e.g.: "users" from "users.repository.ts")
        base_name = interface['name'].replace('.repository.ts', '').replace('.provider.ts', '')

        matched_impl = None
        for impl in implementations:
            impl_base = impl['name'].replace('.repository.ts', '').replace('.provider.ts', '')
            # Remove common prefixes like "prisma-", "memory-", etc.
            impl_clean = re.sub(r'^(prisma-|memory-|redis-|mongo-)', '', impl_base)

            if impl_clean == base_name or base_name in impl_base:
                matched_impl = impl
                break

        mappings.append({
            'interface': interface,
            'implementation': matched_impl
        })

    return mappings


def infer_context_module_mapping(base_path, contexts, modules):
    """Infer mapping between bounded contexts and HTTP modules"""
    mappings = {}

    for context in contexts:
        mappings[context] = []

        # Check entities in the context
        entities_path = os.path.join(base_path, 'src', 'domain', context, 'enterprise', 'entities')
        entity_names = []

        if os.path.exists(entities_path):
            for f in os.listdir(entities_path):
                if f.endswith('.entity.ts'):
                    entity_name = f.replace('.entity.ts', '')
                    entity_names.append(entity_name)

        # Try to map to HTTP modules
        for module in modules:
            module_path = os.path.join(base_path, 'src', 'http', module)

            # Check if the module imports/uses entities from this context
            # Heuristic: module name similar to context or entities
            if module == context:
                mappings[context].append({'module': module, 'confidence': 'exact'})
            elif any(entity in module or module in entity for entity in entity_names):
                mappings[context].append({'module': module, 'confidence': 'inferred'})
            else:
                # Check if there are services that use use-cases from this context
                services_path = os.path.join(module_path, 'services')
                if os.path.exists(services_path):
                    for f in os.listdir(services_path):
                        if f.endswith('.service.ts'):
                            service_file = os.path.join(services_path, f)
                            try:
                                with open(service_file, 'r', encoding='utf-8') as sf:
                                    content = sf.read()
                                    if f'domain/{context}' in content or f"domain/{context}" in content:
                                        mappings[context].append({'module': module, 'confidence': 'import'})
                                        break
                            except:
                                pass

    return mappings


# =============================================================================
# IMPROVEMENT 1: NestJS Module Dependencies Hierarchy
# =============================================================================

def parse_nestjs_module(file_path):
    """Parse a NestJS module file to extract imports, providers, exports, and controllers"""
    result = {
        'imports': [],
        'providers': [],
        'controllers': [],
        'exports': [],
        'bounded_contexts': []
    }

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

            # Find @Module decorator content
            module_match = re.search(r'@Module\s*\(\s*\{([\s\S]*?)\}\s*\)', content)
            if not module_match:
                return result

            module_content = module_match.group(1)

            # Extract imports array
            imports_match = re.search(r'imports\s*:\s*\[([\s\S]*?)\]', module_content)
            if imports_match:
                imports_str = imports_match.group(1)
                # Clean and split
                imports = re.findall(r'(\w+(?:Module)?)', imports_str)
                result['imports'] = [i for i in imports if i.endswith('Module') or i[0].isupper()]

            # Extract providers array
            providers_match = re.search(r'providers\s*:\s*\[([\s\S]*?)\]', module_content)
            if providers_match:
                providers_str = providers_match.group(1)
                # Handle both simple providers and object providers
                simple_providers = re.findall(r'(?<![{\w])(\w+(?:Service|Guard|Provider|UseCase|Repository))', providers_str)
                # Handle { provide: X, useClass: Y } pattern
                object_providers = re.findall(r'provide\s*:\s*(\w+)[\s\S]*?useClass\s*:\s*(\w+)', providers_str)
                result['providers'] = list(set(simple_providers))
                if object_providers:
                    for provide, use_class in object_providers:
                        result['providers'].append(f"{provide} → {use_class}")

            # Extract controllers array
            controllers_match = re.search(r'controllers\s*:\s*\[([\s\S]*?)\]', module_content)
            if controllers_match:
                controllers_str = controllers_match.group(1)
                controllers = re.findall(r'(\w+Controller)', controllers_str)
                result['controllers'] = controllers

            # Extract exports array
            exports_match = re.search(r'exports\s*:\s*\[([\s\S]*?)\]', module_content)
            if exports_match:
                exports_str = exports_match.group(1)
                exports = re.findall(r'(\w+)', exports_str)
                result['exports'] = [e for e in exports if e[0].isupper()]

            # Detect bounded contexts from imports in the file
            domain_imports = re.findall(r"from\s+['\"].*?domain/(\w+)", content)
            result['bounded_contexts'] = list(set(domain_imports))

    except Exception as e:
        pass

    return result


def find_all_nestjs_modules(base_path):
    """Find all NestJS module files and parse them"""
    modules = {}
    http_path = os.path.join(base_path, 'src', 'http')

    if not os.path.exists(http_path):
        return modules

    for root, dirs, files in os.walk(http_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_SET]
        for f in files:
            if f.endswith('.module.ts'):
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, base_path)
                module_name = f.replace('.module.ts', '')

                parsed = parse_nestjs_module(file_path)
                modules[module_name] = {
                    'path': rel_path,
                    'file': f,
                    **parsed
                }

    return modules


def build_module_hierarchy(modules):
    """Build module dependency hierarchy from parsed modules"""
    hierarchy = {}

    # Find root module (app.module)
    root_module = None
    for name, data in modules.items():
        if name == 'app':
            root_module = name
            break

    if not root_module:
        return modules

    # Build tree structure
    def get_children(module_name):
        if module_name not in modules:
            return []
        return [imp.replace('Module', '').lower() for imp in modules[module_name].get('imports', [])
                if imp.replace('Module', '').lower() in modules]

    hierarchy['root'] = root_module
    hierarchy['modules'] = modules
    hierarchy['tree'] = {}

    def build_tree(module_name, visited=None):
        if visited is None:
            visited = set()
        if module_name in visited:
            return {'circular': True}
        visited.add(module_name)

        children = get_children(module_name)
        tree = {}
        for child in children:
            tree[child] = build_tree(child, visited.copy())
        return tree

    hierarchy['tree'] = {root_module: build_tree(root_module)}

    return hierarchy


def print_module_dependencies(base_path):
    """Print NestJS module dependencies hierarchy"""
    print_section_header("🏗️  NESTJS MODULE DEPENDENCIES")

    modules = find_all_nestjs_modules(base_path)

    if not modules:
        print("  No NestJS modules found.\n")
        return

    hierarchy = build_module_hierarchy(modules)

    # Print each module with its details
    # Sort: app first, then @shared modules, then others
    sorted_modules = sorted(modules.keys(), key=lambda x: (
        0 if x == 'app' else (1 if '@shared' in modules[x]['path'] else 2),
        x
    ))

    for module_name in sorted_modules:
        data = modules[module_name]

        # Module header
        is_shared = '@shared' in data['path']
        icon = "📦" if module_name == 'app' else ("🔧" if is_shared else "📁")
        print(f"  {icon} {module_name}.module.ts")
        print(f"      path: {data['path']}")

        # Imports
        if data['imports']:
            print(f"      ├── imports: {', '.join(data['imports'])}")

        # Controllers
        if data['controllers']:
            print(f"      ├── controllers: {', '.join(data['controllers'])}")

        # Providers
        if data['providers']:
            print(f"      ├── providers:")
            for provider in data['providers']:
                print(f"      │       • {provider}")

        # Exports
        if data['exports']:
            print(f"      ├── exports: {', '.join(data['exports'])}")

        # Bounded contexts used
        if data['bounded_contexts']:
            contexts = [c for c in data['bounded_contexts'] if c != '@shared']
            if contexts:
                print(f"      └── uses bounded-contexts: {', '.join(contexts)}")

        print()

    # Print hierarchy tree
    print("  📊 MODULE HIERARCHY TREE:")
    print("  ─────────────────────────")

    def print_tree(tree, prefix="  ", is_last=True):
        items = list(tree.items())
        for i, (name, children) in enumerate(items):
            is_current_last = (i == len(items) - 1)
            connector = "└── " if is_current_last else "├── "
            print(f"{prefix}{connector}{name}.module")

            if isinstance(children, dict) and children:
                if children.get('circular'):
                    print(f"{prefix}{'    ' if is_current_last else '│   '}└── (circular reference)")
                else:
                    new_prefix = prefix + ("    " if is_current_last else "│   ")
                    print_tree(children, new_prefix, is_current_last)

    if 'tree' in hierarchy:
        print_tree(hierarchy['tree'])

    print()


# =============================================================================
# IMPROVEMENT 2: Test Coverage Structural Map
# =============================================================================

def find_source_files(base_path, layer, file_pattern):
    """Find source files matching a pattern in a specific layer"""
    files = []
    layer_path = os.path.join(base_path, 'src', layer)

    if not os.path.exists(layer_path):
        return files

    for root, dirs, filenames in os.walk(layer_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_SET and d != '__tests__']
        for f in filenames:
            if re.match(file_pattern, f) and not f.endswith('.spec.ts') and not f.endswith('.e2e-spec.ts'):
                rel_path = os.path.relpath(os.path.join(root, f), base_path)
                files.append({
                    'name': f,
                    'path': rel_path,
                    'base_name': re.sub(r'\.(use-case|controller|service|entity|vo)\.ts$', '', f)
                })

    return files


def find_test_files(base_path):
    """Find all test files (unit and e2e)"""
    tests = {
        'unit': [],
        'e2e': []
    }

    src_path = os.path.join(base_path, 'src')

    if not os.path.exists(src_path):
        return tests

    for root, dirs, files in os.walk(src_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_SET]
        for f in files:
            if f.endswith('.spec.ts'):
                rel_path = os.path.relpath(os.path.join(root, f), base_path)
                # Check if it's an e2e test (in e2e directory or has .e2e-spec.ts extension)
                is_e2e = f.endswith('.e2e-spec.ts') or '/e2e/' in rel_path.replace('\\', '/') or '\\e2e\\' in rel_path

                if is_e2e:
                    base_name = f.replace('.e2e-spec.ts', '').replace('.spec.ts', '').replace('.controller', '')
                    tests['e2e'].append({
                        'name': f,
                        'path': rel_path,
                        'base_name': base_name
                    })
                else:
                    base_name = f.replace('.spec.ts', '').replace('.use-case', '').replace('.controller', '').replace('.service', '')
                    tests['unit'].append({
                        'name': f,
                        'path': rel_path,
                        'base_name': base_name
                    })

    return tests


def match_source_to_test(source_files, test_files, test_type='unit'):
    """Match source files to their corresponding test files"""
    coverage = []

    for source in source_files:
        source_base = source['base_name']
        source_name = source['name']
        matched_test = None

        for test in test_files:
            test_base = test['base_name']
            test_name = test['name']

            # Strategy 1: Exact base name match
            if source_base == test_base:
                matched_test = test
                break

            # Strategy 2: Source file type matches test file type
            # e.g., "auth.service.ts" should match "auth.service.spec.ts"
            # but NOT "authenticate.use-case.spec.ts"
            source_type = None
            if '.use-case.' in source_name:
                source_type = 'use-case'
            elif '.controller.' in source_name:
                source_type = 'controller'
            elif '.service.' in source_name:
                source_type = 'service'

            test_type_match = None
            if '.use-case.' in test_name:
                test_type_match = 'use-case'
            elif '.controller.' in test_name:
                test_type_match = 'controller'
            elif '.service.' in test_name:
                test_type_match = 'service'

            # Only match if types align (or test has no specific type)
            if source_type and test_type_match and source_type != test_type_match:
                continue

            # Strategy 3: Base name contained (only if same type or no type)
            if source_base == test_base:
                matched_test = test
                break

        coverage.append({
            'source': source,
            'test': matched_test,
            'covered': matched_test is not None
        })

    return coverage


def print_test_coverage_map(base_path):
    """Print test coverage structural map"""
    print_section_header("🧪 TEST COVERAGE STRUCTURAL MAP")

    # Find all test files
    tests = find_test_files(base_path)

    # === USE CASES (Unit Tests) ===
    print("  📋 USE CASES → UNIT TESTS")
    print("  ─────────────────────────")

    use_cases = find_source_files(base_path, 'domain', r'.*\.use-case\.ts$')
    use_case_coverage = match_source_to_test(use_cases, tests['unit'], 'unit')

    covered_count = 0
    total_count = len(use_case_coverage)

    for item in use_case_coverage:
        source = item['source']
        test = item['test']

        if item['covered']:
            covered_count += 1
            print(f"  ✅ {source['name']}")
            print(f"      └── {test['name']}")
        else:
            print(f"  ❌ {source['name']}")
            print(f"      └── (no test found)")

    if total_count > 0:
        percentage = (covered_count / total_count) * 100
        print(f"\n  Coverage: {covered_count}/{total_count} ({percentage:.0f}%)")
    else:
        print("  No use cases found.")

    print()

    # === CONTROLLERS (E2E Tests) ===
    print("  📋 CONTROLLERS → E2E TESTS")
    print("  ──────────────────────────")

    controllers = find_source_files(base_path, 'http', r'.*\.controller\.ts$')
    controller_coverage = match_source_to_test(controllers, tests['e2e'], 'e2e')

    covered_count = 0
    total_count = len(controller_coverage)

    for item in controller_coverage:
        source = item['source']
        test = item['test']

        if item['covered']:
            covered_count += 1
            print(f"  ✅ {source['name']}")
            print(f"      └── {test['name']}")
        else:
            print(f"  ❌ {source['name']}")
            print(f"      └── (no e2e test found)")

    if total_count > 0:
        percentage = (covered_count / total_count) * 100
        print(f"\n  Coverage: {covered_count}/{total_count} ({percentage:.0f}%)")
    else:
        print("  No controllers found.")

    print()

    # === SERVICES (Unit Tests) ===
    print("  📋 SERVICES → UNIT TESTS")
    print("  ────────────────────────")

    services = find_source_files(base_path, 'http', r'.*\.service\.ts$')
    service_coverage = match_source_to_test(services, tests['unit'], 'unit')

    covered_count = 0
    total_count = len(service_coverage)

    for item in service_coverage:
        source = item['source']
        test = item['test']

        if item['covered']:
            covered_count += 1
            print(f"  ✅ {source['name']}")
            print(f"      └── {test['name']}")
        else:
            print(f"  ❌ {source['name']}")
            print(f"      └── (no test found)")

    if total_count > 0:
        percentage = (covered_count / total_count) * 100
        print(f"\n  Coverage: {covered_count}/{total_count} ({percentage:.0f}%)")
    else:
        print("  No services found.")

    print()

    # === OVERALL SUMMARY ===
    print("  📊 OVERALL SUMMARY")
    print("  ──────────────────")

    total_sources = len(use_case_coverage) + len(controller_coverage) + len(service_coverage)
    total_covered = sum(1 for item in use_case_coverage if item['covered']) + \
                   sum(1 for item in controller_coverage if item['covered']) + \
                   sum(1 for item in service_coverage if item['covered'])

    if total_sources > 0:
        overall_percentage = (total_covered / total_sources) * 100
        bar_filled = int(overall_percentage / 5)
        bar_empty = 20 - bar_filled
        progress_bar = "█" * bar_filled + "░" * bar_empty

        print(f"  [{progress_bar}] {overall_percentage:.0f}%")
        print(f"  {total_covered}/{total_sources} files have tests")

        # Status message
        if overall_percentage == 100:
            print("  🎉 All source files have tests!")
        elif overall_percentage >= 80:
            print("  👍 Good coverage, few files missing tests.")
        elif overall_percentage >= 50:
            print("  ⚠️  Moderate coverage, consider adding more tests.")
        else:
            print("  🚨 Low coverage, many files need tests.")
    else:
        print("  No testable source files found.")

    print()


# =============================================================================
# TREE STRUCTURE
# =============================================================================

def list_tree(start_directory):
    """List directory tree with empty folder indication"""
    abs_start_path = os.path.abspath(start_directory)
    print(f"📁 {os.path.basename(abs_start_path)}/")
    _print_tree_recursive(start_directory, "")


def _print_tree_recursive(directory, prefix):
    """Recursive function to print the tree correctly"""
    try:
        entries = os.listdir(directory)
    except PermissionError:
        return

    # Separate directories and files, filtering ignored ones
    dirs = sorted([e for e in entries if os.path.isdir(os.path.join(directory, e)) and e not in IGNORE_SET])
    files = sorted([e for e in entries if os.path.isfile(os.path.join(directory, e))])

    # Combine: directories first, then files
    all_entries = [('dir', d) for d in dirs] + [('file', f) for f in files]

    for i, (entry_type, name) in enumerate(all_entries):
        is_last = (i == len(all_entries) - 1)
        connector = "└── " if is_last else "├── "

        if entry_type == 'dir':
            dir_path = os.path.join(directory, name)
            empty_marker = " (empty)" if is_empty_dir(dir_path) else ""
            print(f"{prefix}{connector}📂 {name}/{empty_marker}")

            # Recursion with new prefix
            new_prefix = prefix + ("    " if is_last else "│   ")
            _print_tree_recursive(dir_path, new_prefix)
        else:
            print(f"{prefix}{connector}📄 {name}")


# =============================================================================
# PRINT HELPERS
# =============================================================================

def print_section_header(title):
    """Print a section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")


def print_bounded_context_map(mappings):
    """Print bounded contexts → HTTP modules map"""
    print_section_header("🗺️  BOUNDED CONTEXTS → HTTP MODULES MAP")

    if not mappings:
        print("  No bounded contexts found.\n")
        return

    for context, modules in mappings.items():
        print(f"  📦 {context} (bounded context)")
        if modules:
            for mod in modules:
                confidence_icon = {
                    'exact': '✅',
                    'inferred': '🔍',
                    'import': '📎'
                }.get(mod['confidence'], '❓')
                print(f"      └── {confidence_icon} http/{mod['module']}/ ({mod['confidence']} match)")
        else:
            print(f"      └── ⚠️  No HTTP module mapped")
        print()

    print("  Legend:")
    print("    ✅ exact    = Module name matches context")
    print("    🔍 inferred = Inferred by entity names")
    print("    📎 import   = Detected via code imports")
    print()


def print_interface_implementation_map(mappings):
    """Print interfaces → implementations map"""
    print_section_header("🔗 INTERFACES → IMPLEMENTATIONS MAP")

    if not mappings:
        print("  No interfaces found.\n")
        return

    for mapping in mappings:
        interface = mapping['interface']
        impl = mapping['implementation']

        print(f"  📋 {interface['name']} (contract)")
        print(f"      path: {interface['path']}")

        if impl:
            print(f"      └── ✅ {impl['name']}")
            print(f"          path: {impl['path']}")
        else:
            print(f"      └── ❌ Implementation NOT found")
        print()


def print_empty_directories_summary(base_path):
    """Print summary of important empty directories"""
    print_section_header("📭 EMPTY DIRECTORIES (may need attention)")

    important_paths = [
        'src/domain',
        'src/http',
        'src/infra'
    ]

    empty_dirs = []

    for important_path in important_paths:
        full_path = os.path.join(base_path, important_path)
        if not os.path.exists(full_path):
            continue

        for root, dirs, files in os.walk(full_path):
            dirs[:] = [d for d in dirs if d not in IGNORE_SET]

            for d in dirs:
                dir_path = os.path.join(root, d)
                if is_empty_dir(dir_path):
                    rel_path = os.path.relpath(dir_path, base_path)
                    empty_dirs.append(rel_path)

    if empty_dirs:
        for empty_dir in sorted(empty_dirs):
            print(f"  📂 {empty_dir}/ (empty)")
    else:
        print("  ✅ No empty directories found in main layers.")
    print()


# =============================================================================
# MAIN
# =============================================================================

def main():
    target_directory = os.getcwd()

    if not os.path.exists(target_directory):
        print(f"❌ Path '{target_directory}' not found.")
        return

    try:
        # 1. Complete folder structure
        print_section_header("📁 FOLDER STRUCTURE")
        list_tree(target_directory)

        # 2. Bounded Contexts → HTTP Modules Map
        contexts = find_bounded_contexts(target_directory)
        modules = find_http_modules(target_directory)
        context_module_map = infer_context_module_mapping(target_directory, contexts, modules)
        print_bounded_context_map(context_module_map)

        # 3. Interfaces → Implementations Map
        interfaces = find_interfaces(target_directory)
        implementations = find_implementations(target_directory)
        interface_impl_map = match_interface_to_implementation(interfaces, implementations)
        print_interface_implementation_map(interface_impl_map)

        # 4. NestJS Module Dependencies (IMPROVEMENT 1)
        print_module_dependencies(target_directory)

        # 5. Test Coverage Structural Map (IMPROVEMENT 2)
        print_test_coverage_map(target_directory)

        # 6. Empty directories summary
        print_empty_directories_summary(target_directory)

    except UnicodeEncodeError:
        print("Encoding error. Try: set PYTHONIOENCODING=utf-8")


if __name__ == "__main__":
    main()
