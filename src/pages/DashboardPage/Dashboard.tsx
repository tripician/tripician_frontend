import React from 'react';
import TripCard from './TripCard';
import '../../assets/css/Dashboard.css';
import santorini from '../../assets/santorini.png';
import kyoto from '../../assets/kyoto.png';
import paris from '../../assets/paris.png';
import dubai from '../../assets/dubai.png';
import astana from '../../assets/astana.png';
import khiva from '../../assets/khiva.png';
import sapa from '../../assets/sapa.png';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { Tabs, Tab, Box } from '@mui/material';
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
    { title: 'Paris Getaway', image: paris, location: 'France', progress: 2, edited: '10 days ago', members: [user, user, user, user] }];

  const private_plans = allPlans.filter(plan => plan.members[0] === user1 && plan.members.length === 1);
  const group_plans = allPlans.filter(plan => plan.members.includes(user1) && plan.members.length > 1);
  const in_progress_plans = allPlans.filter(plan => plan.progress < 100);
  const completed_plans = allPlans.filter(plan => plan.progress === 100);

  const[plans, setPlans] = useState(allPlans);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0) {
      setPlans(allPlans);
    }
    else if (newValue === 1) {
      setPlans(private_plans);
    } 
    else if (newValue === 2) {
      setPlans(group_plans);
    }
    else if (newValue === 3) {
      setPlans(completed_plans);
    }
    else if (newValue === 4) {
      setPlans(in_progress_plans);
    }
  };
  return (
      <Box sx={{ width: "100%", backgroundColor: "background.default", minHeight: "100vh" }}>
        <TopBar />
        
        <Box sx={{ justifyContent: "center" }}>
          <Tabs
            value={tabValue}
            className="mb-1 mt-3"
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="trip tabs"
            sx={{
              pl: 0,
              mt: "1%",
              ml: "2%",
              mr: "2%",
              '& .MuiTabs-flexContainer': {
                backgroundColor: 'action.hover',
                borderRadius: '8px',
                padding: '4px',
              },
              '& .MuiTab-root': {
                minHeight: '40px',
                borderRadius: '6px',
                margin: '0 2px',
                textTransform: 'none',
                fontWeight: 'bold',
                '&.Mui-selected': {
                  backgroundColor: 'background.paper',
                  boxShadow: 1,
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                display: 'none', // Hide the default indicator since we're using background color
              },
            }}
          >
            <Tab label="All Plans" />
            <Tab label="Private" />
            <Tab label="Group" />
            <Tab label="Completed" />
            <Tab label="In Progress" />
          </Tabs>
          <div className="trip-cards-container mb-5">
            {plans.map((plan, index) => (
              <TripCard
                key={index}
                title={plan.title}
                location={plan.location}
                image={plan.image}
                progress={plan.progress}
                edited={plan.edited}
                members={plan.members}
              />
            ))}
          </div>
        </Box>
      </Box>
  );
};
export default Dashboard;