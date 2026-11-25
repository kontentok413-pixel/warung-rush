// Warung Rush data: the ingredients on the counter and the dishes on the
// order board. Every dish needs exactly three different ingredients.
'use strict';

const INGREDIENTS = [
  { id: 'nasi',   name: 'Nasi',   key: '1', color: '#f5f0e1', dark: '#8a7d5f' },
  { id: 'mie',    name: 'Mie',    key: '2', color: '#f2c14e', dark: '#a67c1a' },
  { id: 'telur',  name: 'Telur',  key: '3', color: '#fff8e7', dark: '#c98a2e' },
  { id: 'ayam',   name: 'Ayam',   key: '4', color: '#c96f3f', dark: '#7a3c1c' },
  { id: 'cabai',  name: 'Cabai',  key: '5', color: '#d64541', dark: '#7e1f1c' },
  { id: 'kecap',  name: 'Kecap',  key: '6', color: '#5b3a29', dark: '#2e1c12' },
];

const DISHES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', needs: ['nasi', 'telur', 'kecap'], price: 100 },
  { id: 'mie-goreng',  name: 'Mie Goreng',  needs: ['mie', 'telur', 'cabai'],  price: 100 },
  { id: 'ayam-geprek', name: 'Ayam Geprek', needs: ['ayam', 'cabai', 'nasi'],  price: 120 },
];

const ORDER_TIME = 25;   // seconds an order waits before it is missed
const DAY_LENGTH = 120;  // seconds in one day of service
const MAX_ORDERS = 3;    // tickets on the order board at once

function ingredientById(id) {
  return INGREDIENTS.find(function (item) { return item.id === id; });
}

function dishById(id) {
  return DISHES.find(function (dish) { return dish.id === id; });
}
