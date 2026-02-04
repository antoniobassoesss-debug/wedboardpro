import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { CustomElementTemplate, Point } from '@/layout-maker/types/elements';

export type { CustomElementTemplate, Point };

const getClient = () => browserSupabaseClient;

export async function getCustomElements(plannerId: string): Promise<CustomElementTemplate[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('custom_element_templates')
    .select('*')
    .eq('planner_id', plannerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((item: Record<string, unknown>) => ({
    id: item.id as string,
    plannerId: item.planner_id as string,
    name: item.name as string,
    svgPath: item.svg_path as string,
    width: Number(item.width),
    height: Number(item.height),
    vertices: item.vertices as Point[],
    createdAt: item.created_at as string,
    updatedAt: item.updated_at as string,
  }));
}

export async function getCustomElementById(id: string): Promise<CustomElementTemplate | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('custom_element_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    plannerId: data.planner_id as string,
    name: data.name as string,
    svgPath: data.svg_path as string,
    width: Number(data.width),
    height: Number(data.height),
    vertices: data.vertices as Point[],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function saveCustomElement(
  plannerId: string,
  element: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>
): Promise<CustomElementTemplate | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('custom_element_templates')
    .insert({
      planner_id: plannerId,
      name: element.name,
      svg_path: element.svgPath,
      width: element.width,
      height: element.height,
      vertices: element.vertices,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error saving custom element:', error);
    return null;
  }

  return {
    id: data.id as string,
    plannerId: data.planner_id as string,
    name: data.name as string,
    svgPath: data.svg_path as string,
    width: Number(data.width),
    height: Number(data.height),
    vertices: data.vertices as Point[],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function updateCustomElement(
  id: string,
  updates: Partial<Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt'>>
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.svgPath !== undefined) updateData.svg_path = updates.svgPath;
  if (updates.width !== undefined) updateData.width = updates.width;
  if (updates.height !== undefined) updateData.height = updates.height;
  if (updates.vertices !== undefined) updateData.vertices = updates.vertices;

  const { error } = await client
    .from('custom_element_templates')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating custom element:', error);
    return false;
  }

  return true;
}

export async function deleteCustomElement(id: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { error } = await client
    .from('custom_element_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting custom element:', error);
    return false;
  }

  return true;
}

export async function isCustomElementInUse(templateId: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { data, error } = await client
    .from('layout_custom_element_instances')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId);

  if (error) {
    console.error('Error checking custom element usage:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export async function getCustomElementUsageCount(templateId: string): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  const { data, error } = await client
    .from('layout_custom_element_instances')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId);

  if (error) {
    console.error('Error getting usage count:', error);
    return 0;
  }

  return (data?.length ?? 0);
}

export interface LayoutCustomElementInstance {
  id: string;
  layoutId: string;
  templateId: string;
  elementData: {
    id: string;
    type: string;
    svgPath: string;
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
  };
  createdAt: string;
}

export async function saveCustomElementInstance(
  layoutId: string,
  templateId: string,
  elementData: LayoutCustomElementInstance['elementData']
): Promise<LayoutCustomElementInstance | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('layout_custom_element_instances')
    .insert({
      layout_id: layoutId,
      template_id: templateId,
      element_data: elementData,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error saving custom element instance:', error);
    return null;
  }

  return {
    id: data.id,
    layoutId: data.layout_id,
    templateId: data.template_id,
    elementData: data.element_data,
    createdAt: data.created_at,
  };
}

export async function deleteCustomElementInstancesByTemplate(
  templateId: string,
  layoutId?: string
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  let query = client
    .from('layout_custom_element_instances')
    .delete()
    .eq('template_id', templateId);

  if (layoutId) {
    query = query.eq('layout_id', layoutId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting custom element instances:', error);
    return false;
  }

  return true;
}

export function verticesToSvgPath(vertices: Point[], closePath: boolean = false): string {
  if (vertices.length === 0) return '';

  const pathData = vertices
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ');

  if (closePath) {
    return `${pathData} Z`;
  }

  return pathData;
}

export function calculateBoundingBox(vertices: Point[]): { width: number; height: number; x: number; y: number } {
  if (vertices.length === 0) {
    return { width: 0, height: 0, x: 0, y: 0 };
  }

  const xs = vertices.map((p) => p.x);
  const ys = vertices.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    width: maxX - minX,
    height: maxY - minY,
    x: minX,
    y: minY,
  };
}

export function calculatePerimeter(vertices: Point[], closePath: boolean = false): number {
  if (vertices.length < 2) return 0;

  let perimeter = 0;

  for (let i = 0; i < vertices.length - 1; i++) {
    const p1 = vertices[i];
    const p2 = vertices[i + 1];
    if (!p1 || !p2) continue;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  if (closePath && vertices.length > 2) {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    if (first && last) {
      const dx = first.x - last.x;
      const dy = first.y - last.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
  }

  return perimeter;
}

export function normalizeVertices(vertices: Point[]): Point[] {
  if (vertices.length === 0) return [];

  const bbox = calculateBoundingBox(vertices);

  return vertices.map((point) => ({
    x: point.x - bbox.x,
    y: point.y - bbox.y,
  }));
}

export function svgPathToVertices(svgPath: string): Point[] {
  const vertices: Point[] = [];
  const commandRegex = /([ML])\s*([\d.]+)\s*([\d.]+)/g;
  let match;

  while ((match = commandRegex.exec(svgPath)) !== null) {
    const xStr = match[2];
    const yStr = match[3];
    if (!xStr || !yStr) continue;

    const x = parseFloat(xStr);
    const y = parseFloat(yStr);

    if (!isNaN(x) && !isNaN(y)) {
      vertices.push({ x, y });
    }
  }

  return vertices;
}
