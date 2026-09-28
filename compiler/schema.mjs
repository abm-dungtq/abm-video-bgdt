// schema.mjs — a zero-dependency subset of JSON Schema for scenes.json and template slots.
// Supported: type, required, properties, additionalProperties:false, items, enum, minLength, maxLength,
// minItems, maxItems, minimum, maximum, pattern. Returns "<path>: <message>" strings (empty = valid).

const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v);
const isType = (v, t) => (t === "number" ? typeof v === "number" : t === "integer" ? Number.isInteger(v) : typeOf(v) === t);

export function validate(schema, value, path = "$") {
  const errs = [];
  if (!schema) return errs;
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).some((t) => isType(value, t))) {
    return [`${path}: expected ${schema.type}, got ${typeOf(value)}`];
  }
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path}: must be one of ${schema.enum.join(", ")}`);
  if (typeof value === "string") {
    const n = [...value].length;
    if (schema.minLength != null && n < schema.minLength) errs.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength != null && n > schema.maxLength) errs.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) errs.push(`${path}: does not match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errs.push(`${path}: below ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errs.push(`${path}: above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) errs.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  if (typeOf(value) === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) errs.push(`${path}.${k}: required`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties?.[k]) errs.push(...validate(schema.properties[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${path}.${k}: not allowed`);
    }
  }
  return errs;
}
