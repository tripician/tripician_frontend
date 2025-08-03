import React from 'react';
import DashboardLayout from '../PageLayout/DashboardLayout/DashboardLayout';
import TripCard from './TripCard';
import '../../css/Dashboard.css';
import santorini from '../../../assets/santorini.jpg';
import kyoto from '../../../assets/kyoto.jpg';
import paris from '../../../assets/paris.jpg';
import dubai from '../../../assets/dubai.jpg';
import astana from '../../../assets/astana.jpg';
import khiva from '../../../assets/khiva.jpg';
import sapa from '../../../assets/paris.jpg';
import user from '../../../assets/user.png';
import TopBar from './TopBar';
import { Tabs, Tab } from '@mui/material';
import { useState } from 'react';

const Dashboard: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedMenuItem, setSelectedMenuItem] = useState('Dashboard');
    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
      };
      const handleMenuItemChange = (itemName : string) => {
        setSelectedMenuItem(itemName)
      }

      var items = [
        { title: 'Socializing in Santorini', image: santorini, location: 'Greece', progress: 100, edited: '8h ago', members: [user, user, user, user, user] },
        { title: 'Spring in Sapa', image: sapa, location: 'Vietnam', progress: 30, edited: '2h ago', members: [user, user, user] },
        { title: 'Autumn in astana', image: astana, location: 'Kazakhstan', progress: 60, edited: '2h ago', members: [user, user, user] },
        { title: 'Winter in Khiva', image: khiva, location: 'Uzbekistan', progress: 10, edited: '2h ago', members: [user, user, user] },
        { title: 'Citylife in Dubai', image: dubai, location: 'UAE', progress: 90, edited: '2h ago', members: [user, user, user] },
        { title: 'Kyoto Adventure', image: kyoto, location: 'Tokyo', edited: '5 days ago', members: [user, user] },
        { title: 'Paris Getaway', image: paris, location: 'France', members: [user, user, user, user] }];

  return (
    <DashboardLayout onMenuItemChange={handleMenuItemChange}>
      <TopBar selectedMenuItem = {selectedMenuItem}/>
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
      
      <div className="trip-cards-container mb-5">

            {items.map((item, index) => (
                <TripCard
                key={index}
                title={item.title}
                location={item.location}
                image= {item.image}
                progress={item.progress}
                edited={item.edited}
                members={item.members}
                />
            ))}          
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;