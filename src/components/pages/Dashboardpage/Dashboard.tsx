import React from 'react';
import DashboardLayout from '../PageLayout/DashboardLayout/DashboardLayout';
import TripCard from './TripCard';
import '../../css/Dashboard.css';
import santorini from '../../../assets/santorini.png';
import kyoto from '../../../assets/kyoto.png';
import paris from '../../../assets/paris.png';
import dubai from '../../../assets/dubai.png';
import astana from '../../../assets/astana.png';
import khiva from '../../../assets/khiva.png';
import sapa from '../../../assets/sapa.png';
import TopBar from './TopBar';
import { Tabs, Tab } from '@mui/material';
import { useState } from 'react';

const Dashboard: React.FC = () => {
  // Sample data for trips
  // In a real application, this data would be fetched from an API
  const user = {
    name: 'Abhisek Roy',
    profilePic: import.meta.env.VITE_NO_PROFILE_PIC_URL
  }
  const user1 = {
    name: 'Srideep Kar',
    profilePic: import.meta.env.VITE_NO_PROFILE_PIC_URL
  }
  const user2 = {
    name: 'Rahul Singha',
    profilePic: import.meta.env.VITE_NO_PROFILE_PIC_URL
  }

  var allPlans = [
    { title: 'Socializing in Santorini', image: santorini, location: 'Greece', progress: 100, edited: '8h ago', members: [user1] },
    { title: 'Spring in Sapa', image: sapa, location: 'Vietnam', progress: 30, edited: '2h ago', members: [user1, user2, user] },
    { title: 'Autumn in astana', image: astana, location: 'Kazakhstan', progress: 60, edited: '2h ago', members: [user1, user2, user] },
    { title: 'Winter in Khiva', image: khiva, location: 'Uzbekistan', progress: 10, edited: '2h ago', members: [user, user, user] },
    { title: 'Citylife in Dubai', image: dubai, location: 'UAE', progress: 35, edited: '2h ago', members: [user, user, user] },
    { title: 'Kyoto Adventure', image: kyoto, location: 'Tokyo', progress: 9, edited: '5 days ago', members: [user, user] },
    { title: 'Paris Getaway', image: paris, location: 'France', progress: 2, members: [user, user, user, user] }];

  const private_plans = allPlans.filter(plan => plan.members[0] === user1 && plan.progress === 100 && plan.members.length === 1);
  const group_plans = allPlans.filter(plan => plan.members.includes(user1) && plan.members.length > 1);
  const in_progress_plans = allPlans.filter(plan => plan.progress < 100);

  const[plans, setPlans] = useState(private_plans);
  const [tabValue, setTabValue] = useState(0);
  const [selectedMenuItem, setSelectedMenuItem] = useState('Dashboard');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    console.log('Tab changed to:', newValue);
    if (newValue === 0) {
      setPlans(private_plans);
    }
    else if (newValue === 1) {
      setPlans(group_plans);
    } 
    else if (newValue === 2) {
      setPlans(in_progress_plans);
    }
  };
  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  }; 

  
  
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
        <Tab label="Private Plans"  sx={{ textTransform: "none", fontWeight: "bold"}}/>
        <Tab label="Group Plans"  sx={{ textTransform: "none", fontWeight: "bold" }}/>
        <Tab label="In Progress"  sx={{ textTransform: "none", fontWeight: "bold" }}/>
      </Tabs>
      
      <div className="trip-cards-container mb-5">

            {plans.map((plan, index) => (
                <TripCard
                key={index}
                title={plan.title}
                location={plan.location}
                image= {plan.image}
                progress={plan.progress}
                edited={plan.edited}
                members={plan.members}
                />
            ))}          
      </div>
    </DashboardLayout>
  );
};
export default Dashboard;