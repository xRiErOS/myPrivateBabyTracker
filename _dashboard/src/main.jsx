import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import RoadmapBoard from './views/RoadmapBoard.jsx'
import ItemDetail from './views/ItemDetail.jsx'
import SprintReview from './views/SprintReview.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RoadmapBoard />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/review/:sprintId" element={<SprintReview />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
