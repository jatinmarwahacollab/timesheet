import React, { useState, useEffect } from 'react';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';

const Tags: React.FC = () => {
  const [tags, setTags] = useState<any[]>([]);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (editingTag) {
      setTagName(editingTag.name);
      setTagColor(editingTag.color || '#3B82F6');
    } else {
      setTagName('');
      setTagColor('#3B82F6');
    }
  }, [editingTag]);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        setTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTagForm = (tag: any = null) => {
    setEditingTag(tag);
    setShowTagForm(true);
  };

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTag) {
        const { error } = await supabase
          .from('tags')
          .update({ 
            name: tagName,
            color: tagColor
          })
          .eq('id', editingTag.id);
          
        if (error) throw error;
      } else {
        // Get the organization ID
        const { data: orgData, error: orgError } = await supabase
          .from('org_memberships')
          .select('org_id')
          .single();
          
        if (orgError) throw orgError;
        
        const { error } = await supabase
          .from('tags')
          .insert({ 
            name: tagName,
            color: tagColor,
            org_id: orgData.org_id
          });
          
        if (error) throw error;
      }
      
      setShowTagForm(false);
      fetchTags();
    } catch (error) {
      console.error('Error saving tag:', error);
    }
  };

  const handleDeleteTag = async (tag: any) => {
    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tag.id);
        
      if (error) throw error;
      
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading tags...</div>;
  }

  const colorOptions = [
    { hex: '#EF4444', name: 'Red' },
    { hex: '#F97316', name: 'Orange' },
    { hex: '#F59E0B', name: 'Amber' },
    { hex: '#10B981', name: 'Emerald' },
    { hex: '#3B82F6', name: 'Blue' },
    { hex: '#6366F1', name: 'Indigo' },
    { hex: '#8B5CF6', name: 'Violet' },
    { hex: '#EC4899', name: 'Pink' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="font-medium text-gray-500">
          {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
        </div>
        
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => handleOpenTagForm()}
        >
          New Tag
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tags.map(tag => (
          <div 
            key={tag.id} 
            className="bg-white rounded-lg border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: tag.color || '#3B82F6' }}
                >
                  <Tag className="h-4 w-4 text-white" />
                </div>
                <span className="ml-3 font-medium text-gray-900">
                  {tag.name}
                </span>
              </div>
              
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenTagForm(tag)}
                  icon={<Pencil className="h-4 w-4" />}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTag(tag)}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {tags.length === 0 && (
        <div className="text-center py-12">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tags</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new tag.
          </p>
          <div className="mt-6">
            <Button 
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => handleOpenTagForm()}
            >
              New Tag
            </Button>
          </div>
        </div>
      )}
      
      {/* Tag Form Modal */}
      {showTagForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTag ? 'Edit Tag' : 'New Tag'}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowTagForm(false)}
              >
                <span className="sr-only">Close</span>
                <span className="text-xl font-semibold">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleTagSubmit} className="p-4">
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {colorOptions.map((color) => (
                    <div
                      key={color.hex}
                      onClick={() => setTagColor(color.hex)}
                      className={`h-8 w-8 rounded-full cursor-pointer border-2 ${
                        tagColor === color.hex 
                          ? 'border-gray-900' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowTagForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  {editingTag ? 'Update Tag' : 'Create Tag'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tags;