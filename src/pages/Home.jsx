import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(isLoggedIn() ? "/customize" : "/login");
  };

  return (
    <div className="home">
      <h1>Design. Print. Wear.</h1>
      <p>Create custom T-shirts in seconds.</p>
      <button onClick={handleStart}>Start Designing</button>
    </div>
  );
};

export default Home;
