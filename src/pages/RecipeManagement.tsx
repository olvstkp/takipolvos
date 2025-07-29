import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  percentage: number;
}

interface Recipe {
  id: string;
  productName: string;
  type: 'solid' | 'liquid';
  isActive: boolean;
  ingredients: RecipeIngredient[];
  totalAmount: number;
  description: string;
  createdDate: string;
}

const RecipeManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([
    {
      id: '1',
      productName: 'Zeytinyağlı Kastil Sabunu',
      type: 'solid',
      isActive: true,
      totalAmount: 1000,
      description: 'Doğal zeytinyağından yapılan geleneksel kastil sabun',
      createdDate: '2024-01-15',
      ingredients: [
        { id: '1', name: 'Zeytinyağı', amount: 700, unit: 'ml', percentage: 70 },
        { id: '2', name: 'Kostik Soda', amount: 100, unit: 'g', percentage: 10 },
        { id: '3', name: 'Su', amount: 200, unit: 'ml', percentage: 20 }
      ]
    },
    {
      id: '2',
      productName: 'Lavanta Sabunu',
      type: 'solid',
      isActive: true,
      totalAmount: 800,
      description: 'Lavanta yağı ile zenginleştirilmiş doğal sabun',
      createdDate: '2024-01-14',
      ingredients: [
        { id: '1', name: 'Zeytinyağı', amount: 500, unit: 'ml', percentage: 62.5 },
        { id: '2', name: 'Kostik Soda', amount: 80, unit: 'g', percentage: 10 },
        { id: '3', name: 'Su', amount: 200, unit: 'ml', percentage: 25 },
        { id: '4', name: 'Lavanta Yağı', amount: 20, unit: 'ml', percentage: 2.5 }
      ]
    },
    {
      id: '3',
      productName: 'Sıvı El Sabunu',
      type: 'liquid',
      isActive: true,
      totalAmount: 1000,
      description: 'Günlük kullanım için sıvı el sabunu',
      createdDate: '2024-01-13',
      ingredients: [
        { id: '1', name: 'Sabun Bazı', amount: 200, unit: 'g', percentage: 20 },
        { id: '2', name: 'Su', amount: 750, unit: 'ml', percentage: 75 },
        { id: '3', name: 'Gliserin', amount: 30, unit: 'ml', percentage: 3 },
        { id: '4', name: 'Koruyucu', amount: 20, unit: 'ml', percentage: 2 }
      ]
    }
  ]);

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || recipe.type === selectedType;
    return matchesSearch && matchesType;
  });

  const RecipeForm: React.FC<{ recipe?: Recipe; onClose: () => void }> = ({ recipe, onClose }) => {
    const [formData, setFormData] = useState({
      productName: recipe?.productName || '',
      type: recipe?.type || 'solid' as 'solid' | 'liquid',
      isActive: recipe?.isActive ?? true,
      description: recipe?.description || '',
      ingredients: recipe?.ingredients || [
        { id: '1', name: '', amount: 0, unit: 'g', percentage: 0 }
      ]
    });

    const addIngredient = () => {
      setFormData({
        ...formData,
        ingredients: [
          ...formData.ingredients,
          { id: Date.now().toString(), name: '', amount: 0, unit: 'g', percentage: 0 }
        ]
      });
    };

    const removeIngredient = (id: string) => {
      setFormData({
        ...formData,
        ingredients: formData.ingredients.filter(ing => ing.id !== id)
      });
    };

    const updateIngredient = (id: string, field: string, value: any) => {
      setFormData({
        ...formData,
        ingredients: formData.ingredients.map(ing =>
          ing.id === id ? { ...ing, [field]: value } : ing
        )
      });
    };

    const calculatePercentages = () => {
      const totalAmount = formData.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
      setFormData({
        ...formData,
        ingredients: formData.ingredients.map(ing => ({
          ...ing,
          percentage: totalAmount > 0 ? (ing.amount / totalAmount) * 100 : 0
        }))
      });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      calculatePercentages();
      
      const totalAmount = formData.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
      
      if (recipe) {
        setRecipes(prev => prev.map(r => 
          r.id === recipe.id 
            ? { ...r, ...formData, totalAmount }
            : r
        ));
      } else {
        const newRecipe: Recipe = {
          id: Date.now().toString(),
          ...formData,
          totalAmount,
          createdDate: new Date().toISOString().split('T')[0]
        };
        setRecipes(prev => [...prev, newRecipe]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {recipe ? 'Reçete Düzenle' : 'Yeni Reçete Tanımla'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({...formData, productName: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'solid' | 'liquid'})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="solid">Katı</option>
                  <option value="liquid">Sıvı</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                Aktif Reçete
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Bileşenler</label>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Bileşen Ekle
                </button>
              </div>
              <div className="space-y-2">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={ingredient.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Bileşen adı"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Miktar"
                        value={ingredient.amount}
                        onChange={(e) => updateIngredient(ingredient.id, 'amount', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">
                        {ingredient.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-span-1">
                      {formData.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(ingredient.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={calculatePercentages}
                className="mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Yüzdeleri Hesapla
              </button>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {recipe ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reçete Yönetimi</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Reçete Tanımla
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ürün adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Tipler</option>
            <option value="solid">Katı</option>
            <option value="liquid">Sıvı</option>
          </select>
        </div>
      </div>

      {/* Recipes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Toplam Miktar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Oluşturulma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlemler</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecipes.map((recipe) => (
                <React.Fragment key={recipe.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{recipe.productName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{recipe.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        recipe.type === 'solid' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {recipe.type === 'solid' ? 'Katı' : 'Sıvı'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {recipe.totalAmount.toLocaleString()} g
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        recipe.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {recipe.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(recipe.createdDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingRecipe(recipe);
                            setShowAddModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRecipes(prev => prev.filter(r => r.id !== recipe.id))}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {expandedRecipe === recipe.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRecipe === recipe.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">Reçete Bileşenleri:</h4>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            {recipe.ingredients.map((ingredient) => (
                              <div key={ingredient.id} className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                                <div className="font-medium text-gray-900 dark:text-white">{ingredient.name}</div>
                                <div className="text-gray-600 dark:text-gray-400">
                                  {ingredient.amount.toLocaleString()} {ingredient.unit}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400 font-medium">
                                  {ingredient.percentage.toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <RecipeForm
          recipe={editingRecipe}
          onClose={() => {
            setShowAddModal(false);
            setEditingRecipe(null);
          }}
        />
      )}
    </div>
  );
};

export default RecipeManagement;