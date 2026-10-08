# CleanRoute AI

Full-Stack Smart Municipal Waste Hotspot Prediction & Route Optimization System.

---

## 1. Project Overview

**CleanRoute AI** is an intelligent waste collection dispatch and route-optimization system designed for modern municipalities. By transforming solid-waste operations from rigid schedules into an adaptive, data-driven workflow, CleanRoute AI prevents urban bin overflows, lowers municipal fuel consumption, and optimizes city truck fleet schedules.

---

## 2. Problem Statement

Municipal garbage bins overflow unevenly across urban zones due to variable commercial density, holidays, weekend foot traffic, and road congestion. Collecting every bin on a fixed cyclic route wastes fuel and driver hours on empty containers while missing overflowing bins in critical commercial and market centers. CleanRoute AI continuously assesses urban telemetry, predicts waste hotspot severity with Machine Learning, translates predictions into dynamic priority scores, and solves the multi-stop Vehicle Routing Problem using Google OR-Tools.

---

## 3. Objectives

- **Authoritative Data Integration**: Ingest real urban data from `ml/urban_waste_hotspot_dataset.csv`.
- **Predictive Risk Modeling**: Train a Random Forest Classifier on operational and environmental features to classify hotspot levels into `Low`, `Medium`, and `High` with confidence metrics.
- **Dynamic Priority Scoring**: Combine physical fill percentages, predictive hotspot risks, overflow records, and days since collection into an actionable $0\text{--}100$ score and tier (`Critical`, `High`, `Medium`, `Normal`).
- **Constrained Route Optimization**: Filter `Critical` and `High` priority bins and solve optimal multi-stop paths starting and ending at the Central Depot using Google OR-Tools.
- **Interactive Geospatial Visualization**: Render Leaflet maps showing bin status colors, telemetry popups, stop sequence tooltips, and depot-to-depot route polylines.
- **Real-Time Dispatch & Field Tracking**: Provide role-specific interfaces for municipal Administrators (monitoring, prediction, dispatch) and Drivers (route execution, marking bins collected).
- **Persistent Database Architecture**: Persist bins, collections, historical fill logs, and vehicle fleets in PostgreSQL via Supabase with Row Level Security.

---

## 4. Technology Stack

### Frontend Client
- **Runtime & Package Manager**: **Bun** (`bun@1.3.7`)
- **Framework & Build**: **React 18.3.1**, **Vite 5.4.11**
- **Routing**: **React Router DOM 6.28.0**
- **Styling**: **Tailwind CSS 3.4.16**, PostCSS, Autoprefixer
- **Mapping**: **Leaflet 1.9.4**, **React-Leaflet 4.2.1**
- **Data Visualization**: **Recharts 2.15.0**
- **Icons**: **Lucide React 0.468.0**
- **HTTP Client**: **Axios 1.7.9**
- **Cloud BaaS**: **@supabase/supabase-js 2.47.10**

### Backend Services
- **Runtime**: **Python 3.13.2**
- **Framework**: **FastAPI 0.115.6**, **Uvicorn 0.32.1**
- **Data Validation**: **Pydantic 2.10.3**
- **HTTP Client**: **HTTPX 0.28.1**
- **Environment**: **Python-dotenv 1.0.1**

### Machine Learning & Optimization
- **Data Analysis**: **Pandas 2.2.3**, **NumPy 2.1.3**
- **Machine Learning**: **Scikit-Learn 1.6.0** (`RandomForestClassifier`, `ColumnTransformer`, `SimpleImputer`, `OneHotEncoder`)
- **Model Serialization**: **Joblib 1.4.2** (`ml/model.pkl`)
- **Route Optimization**: **Google OR-Tools 9.15.6755** (`pywrapcp`, `routing_enums_pb2`)

### Database
- **Database**: **PostgreSQL** via **Supabase** (9 relational tables with RLS and triggers)

---

## 5. Dataset Specification

- **Authoritative Dataset Location**: `ml/urban_waste_hotspot_dataset.csv`
- **Total Records**: 20,000 real urban observation rows

### Exact Columns

```
1.  bin_id                  : Unique string identifier (e.g., BIN_00001)
2.  latitude                : Geographic coordinate (Float)
3.  longitude               : Geographic coordinate (Float)
4.  bin_fill_level          : Current fill percentage (0.0 to 100.0%)
5.  traffic_density         : Urban traffic volume index
6.  average_vehicle_speed   : Speed of traffic adjacent to container (km/h)
7.  road_congestion_index   : Congestion metric (0.0 to 1.0)
8.  travel_time_to_bin      : Transit time estimate (minutes)
9.  road_closure_flag       : Binary flag (0 = open, 1 = road closed/blocked)
10. land_use_type           : Categorical ('Residential', 'Commercial', 'Industrial', 'Mixed')
11. last_collection_interval: Days elapsed since container was last emptied
12. historical_fill_average : Historical rolling average fill level (%)
13. overflow_history        : Past container overflow events (count)
14. collection_frequency    : Scheduled pickups per week
15. missed_collection_count : Count of historical missed pickups
16. hour_of_day             : Hour of telemetry observation (0–23)
17. day_of_week             : Day of the week (0 = Monday, 6 = Sunday)
18. month                   : Month of the year (1–12)
19. weekend_flag            : Binary flag (1 if weekend, else 0)
20. holiday_flag            : Binary flag (1 if public holiday, else 0)
21. waste_hotspot_level     : Target class label ('Low', 'Medium', 'High')
```

> **Note**: `bin_id`, `latitude`, and `longitude` are utilized strictly for location tracking, map visualization, and OR-Tools routing; they are **not** passed as training features to the classifier to prevent spatial bias.

---

## 6. Machine Learning Methodology & Random Forest

- **Pipeline Architecture**:
  - **Numeric Pipeline**: 16 continuous features processed via `SimpleImputer(strategy="median")`.
  - **Categorical Pipeline**: `land_use_type` processed via `SimpleImputer(strategy="most_frequent")` followed by `OneHotEncoder(handle_unknown="ignore")`.
  - **Composite Transformer**: `ColumnTransformer` binding all features together into an end-to-end `Pipeline`.
- **Model Classifier**:
  - `RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")`
- **Validation**: 80/20 train/test stratified split on `waste_hotspot_level`.
- **Inference**: Returns predicted class (`High`, `Medium`, or `Low`) and the calibrated probability confidence score (`confidence = max(P(class | X))`).
- **Artifacts**: `ml/train_model.py`, `ml/preprocess.py`, `ml/predict.py`, `ml/model.pkl`.

---

## 7. Dynamic Priority Scoring Engine

The Priority Score ($0.00\text{--}100.00$) establishes operational collection urgency:

$$\text{Priority Score} = (\text{Fill} \times 0.40) + (\text{Hotspot} \times 0.30) + (\text{Overflow} \times 0.15) + (\text{Interval} \times 0.15)$$

### Normalization Parameters
- $\text{Fill} = \text{clamp}(\text{bin\_fill\_level}, 0, 100)$
- $\text{Hotspot} = \text{High} \rightarrow 100, \text{Medium} \rightarrow 60, \text{Low} \rightarrow 30$
- $\text{Overflow} = \text{clamp}\left(\frac{\text{overflow\_history}}{10} \times 100, 0, 100\right)$
- $\text{Interval} = \text{clamp}\left(\frac{\text{last\_collection\_interval}}{14} \times 100, 0, 100\right)$

### Operational Tiers
- **90 – 100**: **Critical** (Immediate dispatch mandatory)
- **70 – 89**: **High** (Scheduled in current active route)
- **40 – 69**: **Medium** (Standard monitoring)
- **0 – 39**: **Normal** (Low overflow risk)

---

## 8. Google OR-Tools Route Optimization

Located in `backend/services/route_service.py`:
- **Eligibility**: Exclusively routes `Critical` and `High` priority containers.
- **Depot**: Central Depot located at latitude `18.5204`, longitude `73.8567`.
- **Cost Formulation**:
  - Great-circle distance between coordinates via the Haversine formula.
  - Traffic multiplier: $1 + \left(\frac{\text{traffic\_density}}{200}\right)$
  - Road closure penalty: $+25\text{ km}$ added if `road_closure_flag = 1`.
- **Algorithm**:
  - First Solution: `PATH_CHEAPEST_ARC`
  - Metaheuristic: `GUIDED_LOCAL_SEARCH`
  - Time Limit: `3 seconds`
- **Output**: Returns sequenced stop order $(1, 2, \dots, N)$, vehicle assignment (`truck_id`), total route distance in km, and estimated transit minutes.

---

## 9. Leaflet Maps & Visualization

- OpenStreetMap tile rendering centered on Central Depot (`18.5204`, `73.8567`).
- Status-coded circular markers:
  - Critical $\rightarrow$ Red (`#EF5350`)
  - High $\rightarrow$ Orange (`#F97316`)
  - Medium $\rightarrow$ Yellow (`#EAB308`)
  - Normal $\rightarrow$ Green (`#16A34A`)
- Interactive popups displaying Bin ID, fill level %, ML hotspot level, priority score, intervals, overflow counts, traffic density, and road congestion.
- Visual stop sequence badges (`#1`, `#2`, ...) on active route waypoints.
- Dynamic route polyline connecting Depot $\rightarrow$ Stop 1 $\rightarrow \dots \rightarrow$ Stop N $\rightarrow$ Depot.

---

## 10. Supabase Database & Security

Schema and seed scripts reside in `database/schema.sql` and `database/seed.sql`:
- **Tables**: `profiles`, `bins`, `bin_history`, `predictions`, `priority_scores`, `trucks`, `routes`, `route_bins`, `collections`.
- **Security**: Row Level Security (RLS) enabled on all tables with authenticated read and insert policies.
- **Automated Sync**: PostgreSQL trigger `on_auth_user_created` creates corresponding profile records.

---

## 11. Complete Application Workflow

```
1. Login (Admin or Driver credentials)
      │
2. Dashboard (Real-time city KPIs, Leaflet overview, Recharts distributions)
      │
3. Bins Directory (Search, filter by status, sort columns, view 17 ML features)
      │
4. Prediction Page (Select bin -> Run Random Forest -> View Class & Confidence -> Calc Priority)
      │
5. Route Optimization (Filter Critical + High bins -> Select Truck -> Run OR-Tools -> View Leaflet sequence)
      │
6. Collections (Driver marks stops collected -> Fill resets to 8% -> Status resets to Normal -> DB updated)
      │
7. Reports (Audit trail, tonnage collections, fill level averages, route distances updated)
```

---

## 12. Setup & Installation Guide

### 1. Environment Configuration

Frontend (`frontend/.env`):
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://127.0.0.1:8000
```

Backend (`backend/.env`):
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MODEL_PATH=../ml/model.pkl
```

### 2. Machine Learning Model Training

Using Python 3.13:
```bash
# From project root
"C:\Users\Saiprasad\AppData\Local\Programs\Python\Python313\python.exe" -m pip install -r backend/requirements.txt
cd ml
"C:\Users\Saiprasad\AppData\Local\Programs\Python\Python313\python.exe" train_model.py
```
*Outputs: Accuracy (~78.3%), Precision, Recall, F1 score, Confusion Matrix, and saves `ml/model.pkl`.*

### 3. Database Setup (Optional Cloud Supabase)
1. Open Supabase SQL Editor.
2. Run `database/schema.sql`.
3. Run `database/seed.sql` (contains real bins from `ml/urban_waste_hotspot_dataset.csv`).

### 4. Start FastAPI Backend
```bash
cd backend
"C:\Users\Saiprasad\AppData\Local\Programs\Python\Python313\python.exe" -m uvicorn main:app --reload --port 8000
```
*API docs available at `http://127.0.0.1:8000/docs`.*

### 5. Start Frontend (Bun Only)
```bash
cd frontend
bun install
bun run dev
```
*Application available at `http://localhost:5173`.*

---

## 13. Default Demonstration Credentials

- **Administrator**: `admin@cleanroute.ai` / `admin123`
- **Field Driver**: `driver@cleanroute.ai` / `driver123` (Assigned Truck: `TRK-01`)
