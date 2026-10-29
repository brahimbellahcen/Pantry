import React, { createContext, useContext, useState } from 'react'

type Lang = 'en' | 'fr' | 'ar'

const translations: Record<Lang, Record<string, string>> = {
  en: {
    'nav.home': 'Home', 'nav.products': 'Products', 'nav.cart': 'Cart',
    'nav.orders': 'Orders', 'nav.wishlist': 'Wishlist', 'nav.profile': 'Profile',
    'nav.admin': 'Admin', 'nav.signout': 'Sign out', 'nav.signin': 'Sign in',
    'nav.signup': 'Sign up',
    'home.hero.title': 'Fresh Groceries Delivered 🥕',
    'home.hero.subtitle': 'Quality produce and pantry staples, at your door in hours.',
    'home.hero.cta': 'Shop Now',
    'home.categories': 'Shop by Category',
    'home.featured': 'Featured Products',
    'product.add_to_cart': 'Add to Cart',
    'product.out_of_stock': 'Out of stock',
    'product.reviews': 'Reviews',
    'product.related': 'You might also like',
    'cart.empty': 'Your cart is empty',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping',
    'cart.tax': 'Tax',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to Checkout',
    'checkout.title': 'Checkout',
    'checkout.address': 'Shipping Address',
    'checkout.payment': 'Payment Method',
    'checkout.cod': 'Cash on Delivery',
    'checkout.bank': 'Bank Transfer',
    'checkout.place_order': 'Place Order',
    'loyalty.points': 'Points',
    'loyalty.balance': 'Your Balance',
    'search.placeholder': 'Search products…',
    'flash.ends_in': 'Ends in',
    'common.free': 'Free',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading…',
  },
  fr: {
    'nav.home': 'Accueil', 'nav.products': 'Produits', 'nav.cart': 'Panier',
    'nav.orders': 'Commandes', 'nav.wishlist': 'Favoris', 'nav.profile': 'Profil',
    'nav.admin': 'Admin', 'nav.signout': 'Déconnexion', 'nav.signin': 'Connexion',
    'nav.signup': "S'inscrire",
    'home.hero.title': 'Épicerie fraîche livrée 🥕',
    'home.hero.subtitle': 'Produits frais et articles du garde-manger livrés en quelques heures.',
    'home.hero.cta': 'Commander',
    'home.categories': 'Parcourir par catégorie',
    'home.featured': 'Produits vedettes',
    'product.add_to_cart': 'Ajouter au panier',
    'product.out_of_stock': 'Rupture de stock',
    'product.reviews': 'Avis',
    'product.related': 'Vous aimerez aussi',
    'cart.empty': 'Votre panier est vide',
    'cart.subtotal': 'Sous-total',
    'cart.shipping': 'Livraison',
    'cart.tax': 'Taxe',
    'cart.total': 'Total',
    'cart.checkout': 'Passer la commande',
    'checkout.title': 'Commande',
    'checkout.address': 'Adresse de livraison',
    'checkout.payment': 'Moyen de paiement',
    'checkout.cod': 'Paiement à la livraison',
    'checkout.bank': 'Virement bancaire',
    'checkout.place_order': 'Confirmer la commande',
    'loyalty.points': 'Points',
    'loyalty.balance': 'Votre solde',
    'search.placeholder': 'Rechercher des produits…',
    'flash.ends_in': 'Se termine dans',
    'common.free': 'Gratuit',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement…',
  },
  ar: {
    'nav.home': 'الرئيسية', 'nav.products': 'المنتجات', 'nav.cart': 'السلة',
    'nav.orders': 'الطلبات', 'nav.wishlist': 'المفضلة', 'nav.profile': 'الملف',
    'nav.admin': 'لوحة التحكم', 'nav.signout': 'تسجيل الخروج', 'nav.signin': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'home.hero.title': 'بقالة طازجة تُوصَّل إليك 🥕',
    'home.hero.subtitle': 'منتجات طازجة وأساسيات المطبخ عند بابك في ساعات.',
    'home.hero.cta': 'تسوق الآن',
    'home.categories': 'تسوق حسب الفئة',
    'home.featured': 'المنتجات المميزة',
    'product.add_to_cart': 'أضف للسلة',
    'product.out_of_stock': 'نفد المخزون',
    'product.reviews': 'التقييمات',
    'product.related': 'قد يعجبك أيضاً',
    'cart.empty': 'سلتك فارغة',
    'cart.subtotal': 'المجموع الجزئي',
    'cart.shipping': 'الشحن',
    'cart.tax': 'الضريبة',
    'cart.total': 'الإجمالي',
    'cart.checkout': 'إتمام الطلب',
    'checkout.title': 'الدفع',
    'checkout.address': 'عنوان التوصيل',
    'checkout.payment': 'طريقة الدفع',
    'checkout.cod': 'الدفع عند الاستلام',
    'checkout.bank': 'تحويل بنكي',
    'checkout.place_order': 'تأكيد الطلب',
    'loyalty.points': 'نقاط',
    'loyalty.balance': 'رصيدك',
    'search.placeholder': 'ابحث عن المنتجات…',
    'flash.ends_in': 'ينتهي في',
    'common.free': 'مجاناً',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.loading': 'جارٍ التحميل…',
  },
}

interface I18nState { lang: Lang; t: (key: string) => string; setLang: (l: Lang) => void; isRTL: boolean }
const I18nContext = createContext<I18nState>({ lang: 'en', t: k => k, setLang: () => {}, isRTL: false })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    (localStorage.getItem('pantry-lang') as Lang) ?? 'en'
  )
  const isRTL = lang === 'ar'

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('pantry-lang', l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  React.useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, isRTL])

  const t = (key: string) => translations[lang][key] ?? translations['en'][key] ?? key

  return <I18nContext.Provider value={{ lang, t, setLang, isRTL }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
