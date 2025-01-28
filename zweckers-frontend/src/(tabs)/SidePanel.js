import Logo from '../assets/images/Logo.png';
import '../styles/SidePanel.css';

function SidePanel() {
  return (

    <div>
      {/* Side Panel Bar */}
      <div className="SidePanel">
        {/* Zweckers Logo */}
        <div className="FullLogo">
          <img className="LogoImage" src={Logo} alt="ZweckersLogo" />
          <p className="GroupName">zweckers</p> 
        </div>

        {/* Dashboard Button */}
        <div className="Button">
          <ion-icon name="analytics-outline"></ion-icon>
          <p className="ButtonName">Dashboard</p>
        </div>

        {/* Chatbot Button */}
        <div className="Button">
          <ion-icon name="chatbox-ellipses"></ion-icon>
          <p className="ButtonName">Chatbot</p>
        </div>

      </div>
    </div>
  );
}

export default SidePanel;
