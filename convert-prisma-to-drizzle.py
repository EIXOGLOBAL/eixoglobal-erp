#!/usr/bin/env python3
"""
Prisma to Drizzle ORM Schema Converter
Converts the complete Prisma schema to Drizzle ORM format
"""

import re
from pathlib import Path

# Type mappings from Prisma to Drizzle
TYPE_MAPPINGS = {
    'String': 'text',
    'Int': 'integer',
    'Float': 'doublePrecision',
    'Boolean': 'boolean',
    'DateTime': 'timestamp',
    'Decimal': 'decimal',
    'Json': 'json',
}

def convert_prisma_type_to_drizzle(prisma_type, attributes):
    """Convert Prisma type to Drizzle type"""
    # Handle special cases
    if prisma_type == 'String' and '@id' in attributes and '@default(uuid())' in attributes:
        return 'uuid'
    if prisma_type == 'String' and '@id' in attributes and '@default(cuid())' in attributes:
        return 'text'  # cuid is text-based
    if prisma_type == 'String' and '@db.Text' in attributes:
        return 'text'
    if prisma_type == 'Decimal':
        # Extract precision and scale from @db.Decimal(18, 4)
        decimal_match = re.search(r'@db\.Decimal\((\d+),\s*(\d+)\)', attributes)
        if decimal_match:
            precision, scale = decimal_match.groups()
            return f'decimal({{ precision: {precision}, scale: {scale} }})'
        return 'decimal'
    if prisma_type == 'Float':
        return 'doublePrecision'
    
    return TYPE_MAPPINGS.get(prisma_type, 'text')

def parse_prisma_schema(schema_path):
    """Parse Prisma schema and extract models and enums"""
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract enums
    enum_pattern = r'enum\s+(\w+)\s*\{([^}]+)\}'
    enums = {}
    for match in re.finditer(enum_pattern, content):
        enum_name = match.group(1)
        enum_values = [v.strip() for v in match.group(2).strip().split('\n') if v.strip() and not v.strip().startswith('//')]
        enums[enum_name] = enum_values
    
    # Extract models
    model_pattern = r'model\s+(\w+)\s*\{([^}]+)\}'
    models = {}
    for match in re.finditer(model_pattern, content, re.MULTILINE | re.DOTALL):
        model_name = match.group(1)
        model_body = match.group(2)
        models[model_name] = model_body
    
    return enums, models

def generate_drizzle_enums(enums):
    """Generate Drizzle enum definitions"""
    lines = []
    lines.append("// ============================================================")
    lines.append("// ENUMS")
    lines.append("// ============================================================\n")
    
    for enum_name, values in sorted(enums.items()):
        # Convert PascalCase to snake_case for enum name
        snake_name = re.sub(r'(?<!^)(?=[A-Z])', '_', enum_name).lower()
        lines.append(f"export const {enum_name[0].lower() + enum_name[1:]}Enum = pgEnum('{snake_name}', [")
        for value in values:
            lines.append(f"  '{value}',")
        lines.append("]);\n")
    
    return '\n'.join(lines)

def count_models_in_schema(schema_path):
    """Count total number of models in Prisma schema"""
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()
    model_pattern = r'model\s+(\w+)\s*\{'
    models = re.findall(model_pattern, content)
    return len(models), models

# Main execution
if __name__ == '__main__':
    schema_path = Path('/workspace/eixoglobal-erp/prisma/schema.prisma')
    
    # Count models
    model_count, model_names = count_models_in_schema(schema_path)
    
    print(f"Total models found: {model_count}")
    print(f"\nModel names:")
    for i, name in enumerate(sorted(model_names), 1):
        print(f"{i:3d}. {name}")
    
    # Parse schema
    enums, models = parse_prisma_schema(schema_path)
    
    print(f"\nTotal enums found: {len(enums)}")
    print(f"Total models parsed: {len(models)}")
