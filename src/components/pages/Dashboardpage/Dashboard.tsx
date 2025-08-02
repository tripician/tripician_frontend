import React from 'react';
import DashboardLayout from '../PageLayout/DashboardLayout/Dashboardlayout';
import TripCard from './Tripcard';
import '../../css/Dashboard.css';
import santorini from '../../../assets/santorini.jpg';
import kyoto from '../../../assets/kyoto.jpg';
import paris from '../../../assets/paris.jpg';
import dubai from '../../../assets/dubai.jpg';
import astana from '../../../assets/astana.jpg';
import khiva from '../../../assets/khiva.jpg';
import sapa from '../../../assets/paris.jpg';
import user from '../../../assets/user.png';
import TopBar from './Topbar';
import { Tabs, Tab } from '@mui/material';
import { useState } from 'react';

const Dashboard: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
      };

  return (
    <DashboardLayout>
      <TopBar/>
      <Tabs
        value={tabValue}
        className="mb-3"
        onChange={handleTabChange}
        textColor="primary"
        indicatorColor="primary"
        aria-label="trip tabs"
        sx={{ pl: 0}}
      >
        <Tab label="Public Trips"  sx={{ textTransform: "none", fontWeight: "bold"}}/>
        <Tab label="Private Trips"  sx={{ textTransform: "none", fontWeight: "bold" }}/>
        <Tab label="In Progress"  sx={{ textTransform: "none", fontWeight: "bold" }}/>
      </Tabs>
      
      <div className="trip-cards-container">
          <TripCard
            title="Spring in Santorini"
            location="Greece"
            image= {santorini}
            progress={100}
            edited="8h ago"
            members={[user, user, user, user, user]}
          />
          <TripCard
            title="Spring in Sapa"
            location="Vietnam"
            image= {sapa}
            progress={30}
            edited="2h ago"
            members={[user, user, user]}
          />
          <TripCard
            title="Autumn in Astana"
            location="Kazakhstan"
            image= {astana}
            progress={60}
            edited="2h ago"
            members={[user, user, user]}
          />
          <TripCard
            title="Winter in Khiva"
            location="Uzbekistan"
            image= {khiva}
            progress={10}
            edited="2h ago"
            members={[user, user, user]}
          />
          <TripCard
            title="Citylife in Dubai"
            location="UAE"
            image= {dubai}
            progress={90}
            edited="2h ago"
            members={[user, user, user]}
          />
          <TripCard
            title="Kyoto Adventure"
            location="Tokyo"
            image= {kyoto}
            edited="5 days ago"
            members={[user, user]}
          />
          <TripCard
            title="Paris Getaway"
            location="France"
            image= {paris}
            members={[user, user, user, user]}
          />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;